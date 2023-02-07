//// 初期設定
// bind
const dataTable = document.getElementById("transaction-data");
const loading = document.getElementById("loading");
const dlbtn = document.getElementById("download");
const dlbtnM = document.getElementById("download-more");

// 全トランザクション格納用
let allTx;
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

// ボタンクリックで呼び出し
function render() {
	// テーブル初期化
	while (dataTable.firstChild) {
		dataTable.removeChild(dataTable.firstChild);
	}
	// ロード表示
	loading.classList.remove("d-none");
	// 入力アドレス取得
	const waddress = document.getElementById("waddress").value;
	getData(waddress);
}
// API
function getJsonTx(waddress) {
	const txAPI = `${flareApi}?module=account&action=txlist&address=${waddress}`;
	return fetch(txAPI).then((response) => response.json());
}
function getJsonTt(waddress) {
	const ttAPI = `${flareApi}?module=account&action=tokentx&address=${waddress}`;
	return fetch(ttAPI).then((response) => response.json());
}
function getJsonDetailTx(hash) {
	const ttDetailAPI = `${flareApi}?module=transaction&action=gettxinfo&txhash=${hash}`;
	return fetch(ttDetailAPI).then((response) => response.json());
}
function getJsonBb(tx) {
	const bbPriceAPI = `${bbPriceUrl}${tx.ymd}`;
	return fetch(bbPriceAPI).then((response) => response.json());
}

function delayReturn(data) {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve(data);
		}, 100);
	});
}

function getData(waddress) {
	return getJsonTx(waddress)
		.then((jsonTx) => {
			const jsonTxResult = jsonTx.result;
			// console.log(jsonTxResult);
			const requests = jsonTxResult.map((tx) => {
				return getJsonDetailTx(tx.hash).then((jsonDetailTx) => {
					tx.logs = jsonDetailTx.result.logs;
					return delayReturn(tx);
				});
			});
			return Promise.all(requests).then((results) => {
				allTx = results;
				return getJsonTt(waddress);
			});
		})
		.then((jsonTt) => {
			const jsonTtResult = jsonTt.result;
			const requests = jsonTtResult.map((tt) => {
				return new Promise((resolve) => {
					resolve(tt);
				});
			});
			return Promise.all(requests).then((results) => {
				// auto claim以外は削除
				for (let i = 0; i < results.length; i++) {
					// console.log(results[i]);
					let ttMethodId = results[i].input.slice(0, 10);
					if (methodId.AutoClaim.indexOf(ttMethodId) === -1) {
						results.splice(i, 1);
						i--;
					}
				}
				// console.log(results);
				if (results.length != 0) {
					return [...allTx, ...results];
				} else {
					return allTx;
				}
			});
		})
		.then((margeAllTx) => {
			// データ整形、
			margeAllTx.forEach((tx) => {
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
				// method種を追加
				for (const [method, midArr] of Object.entries(methodId)) {
					midArr.forEach((mid) => {
						if (tx.methodId == mid) {
							tx.Method = method;
						}
					});
				}
				// methodに合わせてvolume設定
				// console.log(tx.Method);
				// console.log(tx);
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
			});
			// unixtimeで並び替え
			margeAllTx.sort(function (a, b) {
				return b.blockNumber - a.blockNumber;
			});
			// console.log(allTx);
			const requests = margeAllTx.map((tx) => {
				// console.log(tx);
				return getJsonBb(tx).then((candlJson) => {
					if (candlJson.success == 1) {
						const candlesticks = candlJson.data.candlestick[0].ohlcv;
						candlesticks.forEach((minData) => {
							if (minData[5] == tx.unixtimeSec) {
								tx.candlesticks = minData;
								tx.priceAverage = Number(((Number(minData[0]) + Number(minData[1]) + Number(minData[2]) + Number(minData[3])) / 4).toFixed(9));
							}
						});
					}
					return delayReturn(tx);
				});
			});
			return Promise.all(requests).then((results) => {
				// console.log(results);
				return results;
			});
		})
		.then((sortAllTx) => {
			console.log(sortAllTx);
			tableRender(sortAllTx);
		});
}

// 一覧表示
function tableRender(sortAllTx) {
	// console.log(tx);
	//レンダリング
	allTx = sortAllTx;
	sortAllTx.forEach((tx) => {
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
		// テーブルに挿入
		dataTable.appendChild(tr);
	});
	loading.classList.add("d-none");
	dlBtnActive();
}

// トランザクション取得後 ダウンロードボタンアクティブ化
function dlBtnActive() {
	//　ロード非表示
	loading.classList.add("d-none");
	dlbtnM.classList.remove("btn-secondary");
	dlbtnM.classList.add("btn-warning");
	dlbtnM.classList.remove("disabled");
	dlbtn.classList.remove("btn-secondary");
	dlbtn.classList.add("btn-warning");
	dlbtn.classList.remove("disabled");
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
