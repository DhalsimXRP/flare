//// 初期設定
// 全トランザクション格納用
let allTransactions = [];
// csv ソート用配列
const csvSort = ["Timestamp", "Action", "Source", "Base", "Volume", "Price", "Counter", "Fee", "FeeCcy", "Comment"];
const csvSortMore = ["Timestamp", "Method", "Source", "Base", "Volume", "wrapped", "Counter", "Fee", "FeeCcy", "hash", "gas", "gasPrice", "gasUsed", "priceAverage", "FeeJPY", "VolumeJPY"];
// method判別用obj 要確認
const methodId = {
	Claim: "0xb2c12192",
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
const dlbtn = document.getElementById("download");
const dlbtnM = document.getElementById("download-more");
// レンダリング
function render() {
	// テーブル初期化
	while (dataTable.firstChild) {
		dataTable.removeChild(dataTable.firstChild);
	}
	// 入力アドレス取得、API URL生成
	const waddress = document.getElementById("waddress").value;
	const flareUrl = `${flareApi}?module=account&action=txlist&address=${waddress}`;
	const flareTokenUrl = `${flareApi}?module=account&action=tokentx&address=${waddress}`;
	// アドレスの文字数が42文字未満の時はアラート
	if (waddress.length >= 42) {
		// Flare APIからトランザクションデータ取得
		fetch(flareUrl)
			.then((response) => response.json())
			.then((flereJson) => {
				// 前トランザクションを格納
				allTransactions = flereJson.result;
				// トランザクション毎のデータ調整
				let promises = [];
				allTransactions.forEach((transaction) => {
					// console.log("トランザクション処理");
					// 追加情報の初期設定
					transaction.Source = "flare.network";
					transaction.Base = "FLR";
					transaction.Volume = 0;
					transaction.Price = "";
					transaction.Counter = "JPY";
					transaction.FeeCcy = "FLR";
					transaction.Comment = transaction.hash;
					transaction.candlestick = {};
					transaction.priceAverage = 0;
					transaction.wrapped = 0;
					transaction.Fee = division10p18fixed9(transaction.gasPrice * transaction.gasUsed);
					transaction.Method = "Unknown";

					// タイムスタンプをミリ秒変換
					const time = new Date(transaction.timeStamp * 1000);
					// ミリ秒からYMDHMS生成
					transaction.Timestamp = convertToJapanDateTime(time, "YMDHMS");
					// 秒数をゼロに変換
					transaction.unixtimeSec = time.setSeconds(0);
					// 秒数をゼロにしたUNIXTIMEミリ秒からYMD生成
					transaction.ymd = convertToJapanDateTime(transaction.unixtimeSec, "YMD");
					transaction.methodId = transaction.input.slice(0, 10);

					// method種を追加
					for (const [k, v] of Object.entries(methodId)) {
						if (transaction.methodId == v) {
							transaction.Method = k;
							break;
						}
					}
					// トランザクションの詳細データ取得
					let tDtailGetUrl = flareApi + `?module=transaction&action=gettxinfo&txhash=${transaction.hash}`;
					promises.push(
						fetch(tDtailGetUrl)
							.then((response) => response.json())
							.then((tDetailJson) => {
								// logデータを保存
								// console.log("logデータを保存");
								transaction.logs = tDetailJson.result.logs;
								// methodに合わせてlogからvolume設定
								switch (transaction.Method) {
									case "Claim":
										if (transaction.logs[0]) {
											transaction.logs.forEach((log) => {
												// console.log(log);
												let logMethodId = log.topics[0].slice(0, 10);
												if (logMethodId == methodId.logClaim) {
													transaction.Volume = division10p18fixed9(hexConvert(log.data));
												}
											});
										}
										break;
									case "Deposit":
										transaction.wrapped = division10p18fixed9(transaction.value);
										break;
									case "Transfer":
										// Transferの時はActionも設定
										transaction.Volume = division10p18fixed9(transaction.value);
										// 送信元と入力アドレスが同じ場合、FLR送金でマイナス値＆Pay
										if (waddress.toUpperCase() == transaction.from.toUpperCase()) {
											transaction.Volume = -transaction.Volume;
											transaction.Action = "PAY";
										} else {
											// 受け取り時 BONUS
											transaction.Action = "BONUS";
										}
										break;
									default:
										break;
								}
								// methodに合わせてActionを設定
								switch (transaction.Method) {
									case "Claim":
										transaction.Action = "MINING";
										break;
									case "BatchDelegate":
									case "Delegate":
									case "UndelegateAll":
									case "SetAutoClaiming":
									case "EnableDelegationAccount":
									case "Deposit":
									case "CastVote":
									case "Withdraw":
									case "SetClaimExecutors":
										transaction.Action = "SENDFEE";
										break;
									default:
										break;
								}
								// bitbank APIから円価格を取得
								let bbpriceGet = bbPriceUrl + transaction.ymd;
								return fetch(bbpriceGet).then((response) => {
									if (!response.ok) {
										return Promise.resolve({});
									}
									return response.json();
								});
							})
							.then((candlJson) => {
								// １日の1分足全データのため、該当時刻の四本足のみ抽出
								if (candlJson.success == 1) {
									const candlesticks = candlJson.data.candlestick[0].ohlcv;
									// console.log(candlesticks);
									// console.log(transaction.unixtimeSec);
									candlesticks.forEach((minData) => {
										// unixtimeが合致したらデータ取得、四本足の平均値を算出
										if (minData[5] == transaction.unixtimeSec) {
											// console.log(minData);
											transaction.candlestick = minData;
											transaction.priceAverage = Number(((Number(minData[0]) + Number(minData[1]) + Number(minData[2]) + Number(minData[3])) / 4).toFixed(9));
										}
									});
								}
							})
					);
				});
				return Promise.all(promises).then(() => {
					//レンダリング
					allTransactions.forEach((transaction) => {
						const tr = document.createElement("tr");

						let method = document.createElement("td");
						method.innerHTML = transaction.Method;
						method.classList.add("text-center");
						switch (transaction.Method) {
							case "BatchDelegate":
							case "Delegate":
								method.classList.add("bg-primary");
								method.classList.add("text-white");
								break;
							case "Claim":
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
						date.innerHTML = transaction.Timestamp;
						// cryptact用 Action変更セレクト
						let action = document.createElement("td");
						let actionSelect = document.createElement("select");
						actionSelect.classList.add("form-select");
						actions.forEach((action) => {
							let opt = document.createElement("option");
							opt.value = action;
							opt.text = action;
							if (action == transaction.Action) {
								opt.selected = true;
							}
							actionSelect.appendChild(opt);
						});
						// セレクト変更時Action変更
						actionSelect.addEventListener("change", function () {
							transaction.Action = this.value;
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
						hashLink.href = "https://flare-explorer.flare.network/tx/" + transaction.hash;
						hashLink.target = "_blank";
						hashLink.appendChild(linkIcon);
						hashLink.appendChild(document.createTextNode(transaction.hash));
						hash.appendChild(hashLink);
						// wrapped数
						let wrapped = document.createElement("td");
						wrapped.innerHTML = transaction.wrapped;
						// 数量
						let volume = document.createElement("td");
						volume.innerHTML = transaction.Volume;
						// ガス代
						let fee = document.createElement("td");
						fee.innerHTML = transaction.Fee;
						// 平均円価格
						let price = document.createElement("td");
						price.innerHTML = transaction.priceAverage;
						// ガス代円価格
						let feeJpy = document.createElement("td");
						transaction.FeeJPY = (transaction.Fee * transaction.priceAverage).toFixed(9);
						feeJpy.innerHTML = transaction.FeeJPY;
						// 円時価
						let volumeJPY = document.createElement("td");
						transaction.VolumeJPY = (transaction.Volume * transaction.priceAverage).toFixed(9);
						if (transaction.VolumeJPY == 0) {
							transaction.VolumeJPY = 0;
						}
						volumeJPY.innerHTML = transaction.VolumeJPY;
						// 行に挿入
						tr.appendChild(method);
						tr.appendChild(date);
						tr.appendChild(action);
						tr.appendChild(hash);
						tr.appendChild(wrapped);
						tr.appendChild(volume);
						tr.appendChild(fee);
						tr.appendChild(price);
						tr.appendChild(feeJpy);
						tr.appendChild(volumeJPY);
						// テーブルに挿入
						dataTable.appendChild(tr);
					});
					// ボタンを有効化
					dlBtnActive();
				});
			});
	} else {
		// アドレス文字数が42文字未満の時アラート
		alert("Check Your Wallet Address");
	}
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

// トランザクション取得後 ダウンロードボタンアクティブ化
function dlBtnActive() {
	dlbtnM.classList.remove("btn-secondary");
	dlbtnM.classList.add("btn-warning");
	dlbtnM.classList.remove("disabled");
	dlbtn.classList.remove("btn-secondary");
	dlbtn.classList.add("btn-warning");
	dlbtn.classList.remove("disabled");
}

// csv download for cryptact
function downloadCSVforCT() {
	// csv用データ ディープコピー
	let txDeepC = JSON.parse(JSON.stringify(allTransactions));
	let txSorted = [];
	// 不要項目削除
	txDeepC.forEach((txData) => {
		delete txData.candlestick;
		delete txData.logs;
		delete txData.input;
		delete txData.isError;
		delete txData.nonce;
		delete txData.transactionIndex;
		delete txData.value;
		delete txData.txreceipt_status;
		delete txData.contractAddress;
		delete txData.methodId;
		delete txData.ymd;
		delete txData.hash;
		delete txData.blockHash;
		delete txData.blockNumber;
		delete txData.confirmations;
		delete txData.cumulativeGasUsed;
		delete txData.from;
		delete txData.timeStamp;
		delete txData.to;
		delete txData.unixtimeSec;
		delete txData.wrapped;
		delete txData.VolumeJPY;
		delete txData.gas;
		delete txData.gasPrice;
		delete txData.gasUsed;
		delete txData.hash;
		delete txData.Method;
		delete txData.priceAverage;
		delete txData.FeeJPY;
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
		delete txData.Action;
		delete txData.Base;
		delete txData.Source;
		delete txData.candlestick;
		delete txData.logs;
		delete txData.input;
		delete txData.isError;
		delete txData.nonce;
		delete txData.transactionIndex;
		delete txData.value;
		delete txData.txreceipt_status;
		delete txData.contractAddress;
		delete txData.methodId;
		delete txData.ymd;
		delete txData.comment;
		delete txData.blockHash;
		delete txData.blockNumber;
		delete txData.confirmations;
		delete txData.cumulativeGasUsed;
		delete txData.from;
		delete txData.timeStamp;
		delete txData.to;
		delete txData.unixtimeSec;
		delete txData.price;
		delete txData.Counter;
		delete txData.FeeCcy;
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

// 割算
function division10p18fixed9(num) {
	let calc = Number((num / 1000000000).toFixed(9));
	return Number((calc / 1000000000).toFixed(9));
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
