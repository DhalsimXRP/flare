//// 初期設定
// 全トランザクション格納用
let allTransactions = [];
// csv ソート用配列
const csvSort = ["Timestamp", "Action", "Source", "Base", "Volume", "Price", "Counter", "Fee", "FeeCcy", "Comment"];
const csvSortMore = ["Timestamp", "Method", "Source", "Base", "Volume", "Counter", "Fee", "FeeCcy", "hash", "gas", "gasPrice", "gasUsed", "priceAverage", "FeeJPY", "VolumeJPY"];
// method判別用obj 要確認
const methodId = {
	Claim: "0xb2c12192",
	AutoClaim: "0x6a761202",
	BatchDelegate: "0xdc4fcda7",
	Delegate: "0x026e402b",
	UndelegateAll: "0xb302f393",
	SetAutoClaiming: "0xe72dcdbb",
	EnableDelegationAccount: "0xf0977215",
	Deposit: "0xd0e30db0",
	CastVote: "0x56781388",
	Withdraw: "0x2e1a7d4d",
	SetClaimExecutors: "0x9119c494",
	Transfer: "0x",
	logClaim: "0xddf252ad",
};
// cryptact用action配列
const actions = ["BUY", "SELL", "PAY", "MINING", "SENDFEE", "REDUCE", "BONUS", "LENDING", "STAKING", "CASH", "BORROW", "RETURN", "LOSS"];
// API用
const flareApi = "https://flare-explorer.flare.network/api";
const bbPriceUrl = "https://public.bitbank.cc/flr_jpy/candlestick/1min/";
// bind
const dataTable = document.getElementById("transaction-data");
const loading = document.getElementById("loading");
const dlbtn = document.getElementById("download");
const dlbtnM = document.getElementById("download-more");

const getData = function (url) {
	return new Promise(function (resolve, reject) {
		fetch(url)
			.then((response) => response.json())
			.then((data) => resolve(data))
			.catch((error) => reject(error));
	});
};

// ボタンクリックでgetTransactionを呼び出し
function render() {
	loading.classList.remove("d-none");
	getTransaction();
}

//api a transaction
//api b token transfer
//api D transaction detail(log)
//api E bitbank price

function getTransaction() {
	// テーブル初期化
	while (dataTable.firstChild) {
		dataTable.removeChild(dataTable.firstChild);
	}
	// 入力アドレス取得、API URL生成
	const waddress = document.getElementById("waddress").value;
	// transaction API
	const txAPI = `${flareApi}?module=account&action=txlist&address=${waddress}`;
	// token transfer API
	const ttAPI = `${flareApi}?module=account&action=tokentx&address=${waddress}`;

	getData(txAPI).then((txJson) => {
		const txJosnResult = txJson.result;
		// トランザクションLog取得、格納
		txJosnResult.forEach((txData) => {
			const ttDetailAPI = `${flareApi}?module=transaction&action=gettxinfo&txhash=${txData.hash}`;
			getData(ttDetailAPI).then((data) => {
				txData.logs = data.result.logs;
				if (txData.logs[0]) {
					txData.logs.forEach((log) => {
						let logMethodId = log.topics[0].slice(0, 10);
						if (logMethodId == methodId.logClaim) {
							txData.Volume = division10p18fixed9(hexConvert(log.data));
						}
					});
				}
			});
		});
		getData(ttAPI).then((ttJson) => {
			const ttJsonAjust = ttJsonCheck(ttJson);
			const txData = txJson.result;
			const ttData = ttJsonAjust.result;
			// データマージ
			const allTxData = [...txData, ...ttData];
			allTxData.forEach((txData) => {
				// タイムスタンプをミリ秒変換
				const time = new Date(txData.timeStamp * 1000);
				// ミリ秒からYMDHMS生成
				txData.Timestamp = convertToJapanDateTime(time, "YMDHMS");
				// 秒数をゼロに変換
				txData.unixtimeSec = time.setSeconds(0);
				// 秒数をゼロにしたUNIXTIMEミリ秒からYMD生成
				txData.ymd = convertToJapanDateTime(txData.unixtimeSec, "YMD");
				// 追加データ初期値設定
				txData.Source = "flare.network";
				txData.Base = "FLR";
				txData.Volume = 0;
				txData.Price = "";
				txData.Counter = "JPY";
				txData.FeeCcy = "FLR";
				txData.Comment = txData.hash;
				txData.candlesticks = {};
				txData.priceAverage = 0;
				txData.Fee = division10p18fixed9(txData.gasPrice * txData.gasUsed);
				txData.Method = "Unknown";
				txData.methodId = txData.input.slice(0, 10);
				// method種を追加
				for (const [k, v] of Object.entries(methodId)) {
					if (txData.methodId == v) {
						txData.Method = k;
						break;
					}
				}
				// methodに合わせてvolume設定
				switch (txData.Method) {
					case "Claim":
						if (txData.logs[0]) {
							txData.logs.forEach((log) => {
								// console.log(log);
								let logMethodId = log.topics[0].slice(0, 10);
								if (logMethodId == methodId.logClaim) {
									txData.Volume = division10p18fixed9(hexConvert(log.data));
								}
							});
						}
						break;
					case "AutoClaim":
						txData.Volume = division10p18fixed9(txData.value);
						break;
					case "Deposit":
						txData.Volume = division10p18fixed9(txData.value);
						break;
					case "Transfer":
						// Transferの時はActionも設定
						txData.Volume = division10p18fixed9(txData.value);
						// 送信元と入力アドレスが同じ場合、FLR送金でマイナス値＆Pay
						if (waddress.toUpperCase() == txData.from.toUpperCase()) {
							txData.Volume = -txData.Volume;
							txData.Action = "PAY";
						} else {
							// 受け取り時 BONUS、feeはゼロに
							txData.Action = "BONUS";
							txData.Fee = 0;
						}
						break;
					default:
						break;
				}
				// methodに合わせてActionを設定
				switch (txData.Method) {
					case "Claim":
					case "AutoClaim":
						txData.Action = "MINING";
						break;
					case "BatchDelegate":
					case "Delegate":
					case "UndelegateAll":
					case "SetAutoClaiming":
					case "EnableDelegationAccount":
					case "CastVote":
					case "Withdraw":
					case "SetClaimExecutors":
						txData.Action = "SENDFEE";
						break;
					case "Deposit":
						txData.Action = "BONUS";
						break;
					default:
						break;
				}
			});
			// unixtimeで並び替え
			allTxData.sort(function (a, b) {
				return b.blockNumber - a.blockNumber;
			});
			let promises = [];
			const txNum = allTxData.length;
			let count = 0;
			return Promise.all(promises).then(() => {
				allTxData.forEach((txData) => {
					// bitbankから円価格取得
					const bbPriceAPI = `${bbPriceUrl}${txData.ymd}`;
					getData(bbPriceAPI).then((candlJson) => {
						// １日の1分足全データのため、該当時刻の四本足のみ抽出
						if (candlJson.success == 1) {
							const candlesticks = candlJson.data.candlestick[0].ohlcv;
							// console.log(candlesticks);
							// console.log(transaction.unixtimeSec);
							candlesticks.forEach((minData) => {
								// unixtimeが合致したらデータ取得、四本足の平均値を算出
								if (minData[5] == txData.unixtimeSec) {
									// console.log(minData);
									txData.candlesticks = minData;
									txData.priceAverage = Number(((Number(minData[0]) + Number(minData[1]) + Number(minData[2]) + Number(minData[3])) / 4).toFixed(9));
									count++;
								}
							});
						} else {
							count++;
						}
						if (count == txNum) {
							allTransactions = allTxData;
							tableRender(allTxData);
						}
					});
				});
			});
		});
	});
}

// token transferからauto claim以外を削除
function ttJsonCheck(ttJson) {
	let resultsAutoClaim = ttJson.result;
	for (let i = 0; i < resultsAutoClaim.length; i++) {
		let ttMethodId = resultsAutoClaim[i].input.slice(0, 10);
		if (ttMethodId != methodId.AutoClaim) {
			resultsAutoClaim.splice(i, 1);
			i--;
		}
	}
	ttJson.result = resultsAutoClaim;
	return ttJson;
}

function tableRender(allTxData) {
	// console.log(txData);
	//レンダリング
	allTxData.forEach((txData) => {
		// console.log(txData);
		const tr = document.createElement("tr");
		let method = document.createElement("td");
		method.innerHTML = txData.Method;
		method.classList.add("text-center");
		switch (txData.Method) {
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
				break;
			default:
				method.classList.add("bg-light");
		}
		// 日付
		let date = document.createElement("td");
		date.classList.add("text-start");
		date.innerHTML = txData.Timestamp;
		// cryptact用 Action変更セレクト
		let action = document.createElement("td");
		let actionSelect = document.createElement("select");
		actionSelect.classList.add("form-select");
		actions.forEach((action) => {
			let opt = document.createElement("option");
			opt.value = action;
			opt.text = action;
			if (action == txData.Action) {
				opt.selected = true;
			}
			actionSelect.appendChild(opt);
		});
		// セレクト変更時Action変更
		actionSelect.addEventListener("change", function () {
			txData.Action = this.value;
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
		hashLink.href = "https://flare-explorer.flare.network/tx/" + txData.hash;
		hashLink.target = "_blank";
		hashLink.appendChild(linkIcon);
		hashLink.appendChild(document.createTextNode(txData.hash));
		hash.appendChild(hashLink);
		// 数量
		let volume = document.createElement("td");
		volume.innerHTML = txData.Volume;
		// ガス代
		let fee = document.createElement("td");
		fee.innerHTML = txData.Fee;
		// 平均円価格
		let price = document.createElement("td");
		price.innerHTML = txData.priceAverage;
		// ガス代円価格
		let feeJpy = document.createElement("td");
		txData.FeeJPY = (txData.Fee * txData.priceAverage).toFixed(9);
		feeJpy.innerHTML = txData.FeeJPY;
		// 円時価
		let volumeJPY = document.createElement("td");
		txData.VolumeJPY = (txData.Volume * txData.priceAverage).toFixed(9);
		if (txData.VolumeJPY == 0) {
			txData.VolumeJPY = 0;
		}
		volumeJPY.innerHTML = txData.VolumeJPY;
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

// UNIXTIMEから日付変換
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

// 16進->10進変換
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
	let txDeepC = JSON.parse(JSON.stringify(allTransactions));
	let txSorted = [];
	txDeepC.forEach((txData) => {
		const sorted = {};
		csvSort.forEach((key) => {
			if (txData.hasOwnProperty(key)) {
				sorted[key] = txData[key];
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
	let txDeepC = JSON.parse(JSON.stringify(allTransactions));
	let txSorted = [];
	// 不要項目削除
	txDeepC.forEach((txData) => {
		const sorted = {};
		csvSortMore.forEach((key) => {
			if (txData.hasOwnProperty(key)) {
				sorted[key] = txData[key];
			}
		});
		txSorted.push(sorted);
	});
	// ファイル名を指定してダウンロード
	csvDownload(txSorted, "flr-csv-more.csv");
}

function old() {}
