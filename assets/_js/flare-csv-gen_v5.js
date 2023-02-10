// カラーモード
const btn = document.querySelector(".mode-btn");
// チェックした時の挙動
btn.addEventListener("change", () => {
	if (btn.checked == true) {
		// ダークモード
		document.body.classList.remove("light-theme");
		document.body.classList.add("dark-theme");
	} else {
		// ライトモード
		document.body.classList.remove("dark-theme");
		document.body.classList.add("light-theme");
	}
});
if (window.matchMedia("(prefers-color-scheme: light)").matches == true) {
	btn.click();
}

//// 初期設定
// bind
const generate = document.getElementById("generate"),
	dataTable = document.getElementById("transaction-data"),
	loading = document.getElementById("loading"),
	loadingPercent = document.getElementById("loading-percent"),
	progressBar = document.querySelector("#loading .progress-bar"),
	dlbtn = document.getElementById("download"),
	dlbtnM = document.getElementById("download-more"),
	inputWaddress = document.getElementById("waddress"),
	inputStartDate = document.getElementById("starttimestamp"),
	inputEndDate = document.getElementById("endtimestamp"),
	clearStartDate = document.getElementById("clearStartDate"),
	clearEndDate = document.getElementById("clearEndDate"),
	numTx = document.getElementById("num-tx"),
	numTt = document.getElementById("num-tt"),
	numBl = document.getElementById("num-bl");

// グローバル変数トランザクション格納用
let allTx = [],
	blockNumArr = [],
	waddress = "",
	starttimestamp = "",
	startUnixtime = "",
	endtimestamp = "",
	endUnixtime = "";

const delayMS = 50,
	delayCount = 20,
	minDate = "2023-01-10";
// csv ソート用配列
const csvSort = ["Timestamp", "Action", "Source", "Base", "Volume", "Price", "Counter", "Fee", "FeeCcy", "Comment"];
const csvSortMore = ["Timestamp", "Method", "Source", "Base", "Volume", "Counter", "Fee", "FeeCcy", "hash", "gas", "gasPrice", "gasUsed", "priceAverage", "FeeJPY", "VolumeJPY"];
// method判別用obj 要確認
const methodId = {
	Claim: ["0xb2c12192", "0xb2af870a"],
	AutoClaim: ["0x6a761202", "0x8dc305fa"],
	logOhterClaim: ["0x6ec68517"],
	logAutoClaim: ["0xddf252ad"],
	BatchDelegate: ["0xdc4fcda7"],
	Delegate: ["0x026e402b"],
	UndelegateAll: ["0xb302f393"],
	SetAutoClaiming: ["0xe72dcdbb"],
	EnableDelegationAccount: ["0xf0977215"],
	Deposit: ["0xd0e30db0"],
	CastVote: ["0x56781388"],
	Withdraw: ["0x2e1a7d4d"],
	SetClaimExecutors: ["0x9119c494"],
	Transfer: ["0x"],
};
// cryptact用action配列
const actions = ["BUY", "SELL", "PAY", "MINING", "SENDFEE", "REDUCE", "BONUS", "LENDING", "STAKING", "CASH", "BORROW", "RETURN", "LOSS"];
// API用
const flareApi = "https://flare-explorer.flare.network/api";
const bbPriceUrl = "https://public.bitbank.cc/flr_jpy/candlestick/1min/";

// data range fix
inputStartDate.addEventListener("change", () => {
	startDate();
});
clearStartDate.addEventListener("click", () => {
	inputStartDate.value = "";
	startDate();
});
function startDate() {
	if (inputStartDate.value) {
		inputEndDate.min = inputStartDate.value;
	} else {
		inputEndDate.min = minDate;
	}
}
inputEndDate.addEventListener("change", () => {
	endDate();
});
clearEndDate.addEventListener("click", () => {
	inputEndDate.value = "";
	endDate();
});
function endDate() {
	if (inputEndDate.value) {
		inputStartDate.max = inputEndDate.value;
	} else {
		inputStartDate.max = "";
	}
}

// start
function start() {
	// 各データリセット
	allTx = [];
	blockNumArr = [];
	waddress = "";
	starttimestamp = "";
	endtimestamp = "";

	// 入力アドレス取得
	waddress = inputWaddress.value;
	// 日付確認
	let starttimestampValue = inputStartDate.value;
	let endtimestampValue = inputEndDate.value;
	if (starttimestampValue) {
		// console.log(starttimestampValue);
		startUnixtime = convertToUnixTime(starttimestampValue);
		starttimestamp = "&starttimestamp=" + startUnixtime;
		// console.log(starttimestamp);
	}
	if (endtimestampValue) {
		// console.log(endtimestampValue);　終了は指定日中、unixtimesec１日分追加
		endUnixtime = convertToUnixTime(endtimestampValue) + 60 * 60 * 24;
		endtimestamp = "&endtimestamp=" + endUnixtime;
		// console.log(endtimestamp);
	}
	// ウォレット文字数確認
	if (waddress.length == 42) {
		// リセット
		// テーブル初期化
		while (dataTable.firstChild) {
			dataTable.removeChild(dataTable.firstChild);
		}

		// 数値リセット
		numTx.textContent = "0";
		numTt.textContent = "0";
		numBl.textContent = "0";

		// 読込ボタン,日付削除ボタン無効化
		generate.classList.add("btn-secondary");
		generate.classList.remove("btn-warning");
		generate.classList.add("disabled");
		clearStartDate.classList.add("btn-secondary");
		clearStartDate.classList.remove("btn-warning");
		clearStartDate.classList.add("disabled");
		clearEndDate.classList.add("btn-secondary");
		clearEndDate.classList.remove("btn-warning");
		clearEndDate.classList.add("disabled");

		// ダウンロードボタン無効化
		dlbtnM.classList.add("btn-secondary");
		dlbtnM.classList.remove("btn-warning");
		dlbtnM.classList.add("disabled");
		dlbtn.classList.add("btn-secondary");
		dlbtn.classList.remove("btn-warning");
		dlbtn.classList.add("disabled");

		// loading表示
		loading.classList.remove("pre-load");
		// データ取得へ
		getTx(waddress, allTx, blockNumArr);
	} else {
		alert("Wrong address length.\nCheck wallet address.");
	}
}

// get transaction & detail log
function getTx(waddress, allTx, blockNumArr) {
	// console.log("get transaction");
	// console.log(starttimestamp);
	// console.log(endtimestamp);
	fetch(`${flareApi}?module=account&action=txlist&address=${waddress}${starttimestamp}${endtimestamp}`)
		.then((response) => response.json())
		.then((jsonTx) => {
			const jsonTxResult = jsonTx.result;
			// console.log(jsonTxResult);
			jsonTxResult.forEach((tx) => {
				// console.log(tx);
				// console.log(tx.blockNumber);
				// 情報追加・データ格納
				tx.dataSource = "transactions";
				allTx.push(tx);
				blockNumArr.push(tx.blockNumber);
			});
			// tx count view
			for (let i = 1; i <= jsonTxResult.length; i++) {
				setTimeout(() => {
					numTx.textContent = i;
				}, i * delayCount);
			}
			getTt(waddress, allTx, blockNumArr);
		});
}

// get token transfer
function getTt(waddress, allTx, blockNumArr) {
	// console.log("get token transfer");
	fetch(`${flareApi}?module=account&action=tokentx&address=${waddress}${starttimestamp}${endtimestamp}`)
		.then((response) => response.json())
		.then((jsonTt) => {
			const jsonTtResult = jsonTt.result;
			// console.log(jsonTtResult);
			jsonTtResult.forEach((tt) => {
				// console.log(tt);
				// console.log(tt.blockNumber);
				// 情報追加・データ格納
				// 指定期間内 & block Numberが被っていない & tokenSYmbolが WFLR or FLRの時場合に追加
				if (Number(tt.timeStamp) >= Number(startUnixtime) && Number(tt.timeStamp) <= Number(endUnixtime) && blockNumArr.indexOf(tt.blockNumber) === -1 && (tt.tokenSymbol == "FLR" || tt.tokenSymbol == "WFLR")) {
					allTx.push(tt);
					blockNumArr.push(tt.blockNumber);
				}
			});
			// tx count view
			for (let i = 1; i <= jsonTtResult.length; i++) {
				setTimeout(() => {
					numTt.textContent = i;
				}, i * delayCount);
			}
			// block count view
			for (let i = 1; i <= blockNumArr.length; i++) {
				setTimeout(() => {
					numBl.textContent = i;
				}, i * delayCount);
			}
			allTxAjust(allTx);
		});
}

// data ajust
function allTxAjust(allTx) {
	// console.log("data ajust");
	// blockNumberで並び替え
	allTx.sort(function (a, b) {
		return a.blockNumber - b.blockNumber;
	});
	// 初期値設定、必要データ生成
	allTx.forEach((tx) => {
		// console.log(tx);
		// タイムスタンプをミリ秒変換
		const time = new Date(tx.timeStamp * 1000);
		// ミリ秒からYMDHMS生成
		tx.Timestamp = convertToJapanDateTime(time, "YMDHMS");
		// 秒数をゼロに変換
		tx.unixtimeSec = time.setSeconds(0);
		// 秒数をゼロにしたUNIXTIMEミリ秒からYMD生成
		tx.ymd = convertToJapanDateTime(tx.unixtimeSec, "YMD");
		// 追加データ初期値設定
		tx.Source = "flare.network";
		tx.Base = "FLR";
		tx.Volume = 0;
		tx.Price = "";
		tx.Counter = "JPY";
		tx.FeeCcy = "FLR";
		tx.Comment = tx.hash;
		tx.candlesticks = {};
		tx.priceAverage = 0;
		tx.Fee = division10p18fixed9(tx.gasPrice * tx.gasUsed);
		tx.Method = "UNKNOWN";
		tx.methodId = tx.input.slice(0, 10);
		tx.logs = [];
		// method種を配列から判別して追加
		for (const [method, mIdArr] of Object.entries(methodId)) {
			mIdArr.forEach((mId) => {
				if (tx.methodId == mId) {
					tx.Method = method;
				}
			});
		}
	});
	// console.log(allTx);
	// log price取得へ
	getLogsPrice(allTx);
}

// get logs & get price from bitbank
function getLogsPrice(allTx) {
	// console.log("get logs & get price from bitbank");
	// console.log(allTx);
	let index = 0;
	const dataLength = allTx.length;
	// allTxをループしながら,dataSoure:transactions時にlogsを取得(token transferはスキップ)、bitbankから価格を取得、レンダリング
	function getData() {
		if (index === dataLength) {
			// 全てのlog、価格取得後、ダウンロードボタンをアクティブに;
			dlBtnActive();
		} else {
			const hash = allTx[index].hash;
			// hashから詳細データ取得
			fetch(`${flareApi}?module=transaction&action=gettxinfo&txhash=${hash}`)
				.then((response) => response.json())
				.then((jsonDetailTx) => {
					// dataSourceがtransactions時logsを格納
					if (allTx[index].dataSource == "transactions") {
						allTx[index].logs = jsonDetailTx.result.logs;
					}
					// bitbankから価格取得へ
					fetch(`${bbPriceUrl}${allTx[index].ymd}`)
						.then((response) => response.json())
						.then((candlJson) => {
							if (candlJson.success == 1) {
								const candlesticks = candlJson.data.candlestick[0].ohlcv;
								candlesticks.forEach((minData) => {
									if (minData[5] == allTx[index].unixtimeSec) {
										allTx[index].candlesticks = minData;
										allTx[index].priceAverage = Number(((Number(minData[0]) + Number(minData[1]) + Number(minData[2]) + Number(minData[3])) / 4).toFixed(9));
									}
								});
							}
							// １レコード毎にテーブルレンダリング
							tableRender(allTx[index]);
							index++;
							// progress bar更新
							progress(index, blockNumArr.length);
							setTimeout(getData, delayMS);
						});
				});
		}
	}
	getData();
}

// 一覧表示
function tableRender(tx) {
	// console.log("tableRender");
	// console.log(tx);
	// レンダリング前に追加調整
	// methodに合わせてvolume設定
	switch (tx.Method) {
		case "Claim":
			if (tx.logs[0]) {
				tx.logs.forEach((log) => {
					// console.log(log);
					let logMethodId = log.topics[0].slice(0, 10);
					// console.log(logMethodId);
					// auto claim時
					if (methodId.logAutoClaim.indexOf(logMethodId) !== -1) {
						tx.Volume = division10p18fixed9(hexConvert(log.data));
					}
					// other claim時
					if (methodId.logOhterClaim.indexOf(logMethodId) !== -1) {
						// console.log(log.data);
						tx.Volume = division10p18fixed9(hexConvert(log.data.slice(log.data.length - 64)));
					}
				});
			}
			break;
		case "SetAutoClaiming":
			tx.Fee = tx.Fee + division10p18fixed9(tx.value);
			break;
		case "AutoClaim":
			tx.Volume = division10p18fixed9(tx.value);
			break;
		case "Withdraw":
			tx.Volume = division10p18fixed9(hexConvert(tx.input.slice(tx.input.length - 16)));
			break;
		case "Deposit":
			tx.Volume = division10p18fixed9(tx.value);
			break;
		case "Transfer":
			// Transferの時はActionも設定
			tx.Volume = division10p18fixed9(tx.value);
			// 送信元と入力アドレスが同じ場合、FLR送金でマイナス値＆Pay
			if (waddress.toUpperCase() == tx.from.toUpperCase()) {
				tx.Volume = -tx.Volume;
				tx.Action = "PAY";
			} else {
				// 受け取り時 BONUS、feeはゼロに
				tx.Action = "BONUS";
				tx.Fee = 0;
			}
			break;
		default:
			break;
	}
	// methodに合わせてActionを設定
	switch (tx.Method) {
		case "Claim":
		case "AutoClaim":
			tx.Action = "MINING";
			break;
		case "BatchDelegate":
		case "Delegate":
		case "UndelegateAll":
		case "SetAutoClaiming":
		case "EnableDelegationAccount":
		case "CastVote":
		case "SetClaimExecutors":
		case "Withdraw":
		case "Deposit":
			tx.Action = "SENDFEE";
			break;
		case "UNKNOWN":
			tx.Action = "CASH";
			break;
		default:
			break;
	}

	// レンダリング
	// console.log(tx);
	const tr = document.createElement("tr");
	let method = document.createElement("td");
	method.innerHTML = tx.Method;
	method.classList.add("text-center");
	switch (tx.Method) {
		case "BatchDelegate":
		case "Delegate":
			method.classList.add("bg-primary");
			method.classList.add("text-white");
			break;
		case "Claim":
		case "AutoClaim":
			method.classList.add("bg-warning");
			method.classList.add("text-dark");
			break;
		case "Deposit":
			method.classList.add("bg-success");
			method.classList.add("text-white");
			method.insertAdjacentText("beforeend", " (Wrapped)");
			break;
		case "Withdraw":
			method.classList.add("bg-success");
			method.classList.add("text-white");
			method.insertAdjacentText("beforeend", " (Unwrapped)");
			break;
		default:
			method.classList.add("bg-light");
			method.classList.add("text-dark");
	}
	// 日付
	let date = document.createElement("td");
	date.classList.add("text-start");
	date.innerHTML = tx.Timestamp;
	// cryptact用 Action変更セレクト
	let action = document.createElement("td");
	let actionSelect = document.createElement("select");
	actionSelect.classList.add("form-select");
	actions.forEach((action) => {
		let opt = document.createElement("option");
		opt.value = action;
		opt.text = action;
		if (action == tx.Action) {
			opt.selected = true;
		}
		actionSelect.appendChild(opt);
	});
	// セレクト変更時Action変更
	actionSelect.addEventListener("change", function () {
		tx.Action = this.value;
	});
	action.appendChild(actionSelect);
	// ハッシュ
	let hash = document.createElement("td");
	hash.classList.add("text-start");
	// ハッシュリンク
	let linkIcon = document.createElement("span");
	linkIcon.classList.add("material-symbols-outlined");
	linkIcon.innerHTML = "link";
	let hashLink = document.createElement("a");
	hashLink.href = "https://flare-explorer.flare.network/tx/" + tx.hash;
	hashLink.target = "_blank";
	hashLink.appendChild(linkIcon);
	hashLink.appendChild(document.createTextNode(tx.hash));
	hash.appendChild(hashLink);
	// 数量
	let volume = document.createElement("td");
	volume.innerHTML = tx.Volume;
	// ガス代
	let fee = document.createElement("td");
	fee.innerHTML = tx.Fee;
	// 平均円価格
	let price = document.createElement("td");
	price.innerHTML = tx.priceAverage;
	// ガス代円価格
	let feeJpy = document.createElement("td");
	tx.FeeJPY = (tx.Fee * tx.priceAverage).toFixed(9);
	feeJpy.innerHTML = tx.FeeJPY;
	// 円時価
	let volumeJPY = document.createElement("td");
	tx.VolumeJPY = (tx.Volume * tx.priceAverage).toFixed(9);
	if (tx.VolumeJPY == 0 || tx.Method == "Withdraw" || tx.Method == "Deposit") {
		tx.VolumeJPY = 0;
	}
	volumeJPY.innerHTML = tx.VolumeJPY;
	// 行に挿入
	tr.appendChild(method);
	tr.appendChild(date);
	tr.appendChild(action);
	tr.appendChild(hash);
	tr.appendChild(volume);
	tr.appendChild(fee);
	tr.appendChild(price);
	tr.appendChild(feeJpy);
	tr.appendChild(volumeJPY);
	// テーブルの先頭に挿入
	dataTable.prepend(tr);
}

function progress(loadIndex, blockNum) {
	let percentNum = Math.ceil((loadIndex / blockNum) * 100);
	let percent = percentNum + "%";
	progressBar.setAttribute("aria-valuenow", percentNum);
	progressBar.style.width = percent;
	if (percent == "100%") {
		loadingPercent.innerHTML = "Complete.";
	} else {
		loadingPercent.innerHTML = percent;
	}
}

// トランザクション取得後 ダウンロードボタンアクティブ化
function dlBtnActive() {
	// ダウンロードボタン有効化
	dlbtnM.classList.remove("btn-secondary");
	dlbtnM.classList.add("btn-warning");
	dlbtnM.classList.remove("disabled");
	dlbtn.classList.remove("btn-secondary");
	dlbtn.classList.add("btn-warning");
	dlbtn.classList.remove("disabled");
	// progress bar reset
	setTimeout(() => {
		// 読込ボタン有効化
		loading.classList.add("pre-load");
		generate.classList.remove("btn-secondary");
		generate.classList.add("btn-warning");
		generate.classList.remove("disabled");
		clearStartDate.classList.remove("btn-secondary");
		clearStartDate.classList.add("btn-warning");
		clearStartDate.classList.remove("disabled");
		clearEndDate.classList.remove("btn-secondary");
		clearEndDate.classList.add("btn-warning");
		clearEndDate.classList.remove("disabled");
	}, 2000);
	setTimeout(() => {
		// progress reset
		progressBar.setAttribute("aria-valuenow", "0");
		progressBar.style.width = "0%";
		loadingPercent.innerHTML = "0%";
	}, 2500);
}

// 割算
function division10p18fixed9(num) {
	let calc = Number((num / 1000000000).toFixed(9));
	return Number((calc / 1000000000).toFixed(9));
}

// UNIXTIME to Date
function convertToJapanDateTime(unixTime, output) {
	const date = new Date(unixTime);
	if (output == "YMDHMS") {
		date.setHours(date.getHours());
	} else if (output == "YMD") {
		// bitbankから価格取得するために9時間調整
		date.setHours(date.getHours() - 9);
	}
	const year = date.getFullYear();
	const month = (date.getMonth() + 1).toString().padStart(2, "0");
	const day = date.getDate().toString().padStart(2, "0");
	const hours = date.getHours().toString().padStart(2, "0");
	const minutes = date.getMinutes().toString().padStart(2, "0");
	const seconds = ("0" + date.getSeconds()).slice(-2);
	if (output == "YMDHMS") {
		return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
	} else if (output == "YMD") {
		return `${year}${month}${day}`;
	}
}

// hex to dicimal
function hexConvert(hex) {
	return parseInt(hex, 16);
}

// YYYY-MM-DD to unixtime
function convertToUnixTime(date) {
	return Math.floor(new Date(date).getTime() / 1000);
}

// csv download
function csvDownload(obj, fileName) {
	// csvのheader生成
	const keys = Object.keys(obj[0]);
	const header = keys.join(",");
	const rows = obj.map((row) => Object.values(row).join(","));
	const csv = header + "\n" + rows.join("\n");
	const blob = new Blob([csv], { type: "text/csv" });
	// download
	const dlLink = document.createElement("a");
	dlLink.href = URL.createObjectURL(blob);
	dlLink.download = fileName;
	dlLink.click();
	dlLink.remove();
}

// csv download for cryptact
function downloadCSVforCT() {
	// csv用データ ディープコピー
	let txDeepC = JSON.parse(JSON.stringify(allTx));
	let txSorted = [];
	txDeepC.forEach((tx) => {
		const sorted = {};
		csvSort.forEach((key) => {
			if (tx.hasOwnProperty(key)) {
				sorted[key] = tx[key];
			}
		});
		txSorted.push(sorted);
	});
	// ファイル名を指定してダウンロード
	csvDownload(txSorted, "flr-csv-for-cryptact.csv");
}

// csv download for more
function downloadCSVMore() {
	// csv用データ ディープコピー
	let txDeepC = JSON.parse(JSON.stringify(allTx));
	let txSorted = [];
	// 不要項目削除
	txDeepC.forEach((tx) => {
		const sorted = {};
		csvSortMore.forEach((key) => {
			if (tx.hasOwnProperty(key)) {
				sorted[key] = tx[key];
			}
		});
		txSorted.push(sorted);
	});
	// ファイル名を指定してダウンロード
	csvDownload(txSorted, "flr-csv-more.csv");
}
