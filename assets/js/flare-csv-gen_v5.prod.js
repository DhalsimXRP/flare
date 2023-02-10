"use strict";function _slicedToArray(e,t){return _arrayWithHoles(e)||_iterableToArrayLimit(e,t)||_nonIterableRest()}function _nonIterableRest(){throw new TypeError("Invalid attempt to destructure non-iterable instance")}function _iterableToArrayLimit(e,t){if(Symbol.iterator in Object(e)||"[object Arguments]"===Object.prototype.toString.call(e)){var a=[],n=!0,r=!1,i=void 0;try{for(var o,c=e[Symbol.iterator]();!(n=(o=c.next()).done)&&(a.push(o.value),!t||a.length!==t);n=!0);}catch(e){r=!0,i=e}finally{try{n||null==c.return||c.return()}finally{if(r)throw i}}return a}}function _arrayWithHoles(e){if(Array.isArray(e))return e}var btn=document.querySelector(".mode-btn");btn.addEventListener("change",function(){1==btn.checked?(document.body.classList.remove("light-theme"),document.body.classList.add("dark-theme")):(document.body.classList.remove("dark-theme"),document.body.classList.add("light-theme"))}),1==window.matchMedia("(prefers-color-scheme: light)").matches&&btn.click();var generate=document.getElementById("generate"),dataTable=document.getElementById("transaction-data"),loading=document.getElementById("loading"),loadingPercent=document.getElementById("loading-percent"),progressBar=document.querySelector("#loading .progress-bar"),dlbtn=document.getElementById("download"),dlbtnM=document.getElementById("download-more"),inputWaddress=document.getElementById("waddress"),inputStartDate=document.getElementById("starttimestamp"),inputEndDate=document.getElementById("endtimestamp"),clearStartDate=document.getElementById("clearStartDate"),clearEndDate=document.getElementById("clearEndDate"),numTx=document.getElementById("num-tx"),numTt=document.getElementById("num-tt"),numBl=document.getElementById("num-bl"),allTx=[],blockNumArr=[],waddress="",starttimestamp="",startUnixtime="",endtimestamp="",endUnixtime="",delayMS=50,delayCount=20,minDate="2023-01-10",csvSort=["Timestamp","Action","Source","Base","Volume","Price","Counter","Fee","FeeCcy","Comment"],csvSortMore=["Timestamp","Method","Source","Base","Volume","Counter","Fee","FeeCcy","hash","gas","gasPrice","gasUsed","priceAverage","FeeJPY","VolumeJPY"],methodId={Claim:["0xb2c12192","0xb2af870a"],AutoClaim:["0x6a761202","0x8dc305fa"],logOhterClaim:["0x6ec68517"],logAutoClaim:["0xddf252ad"],BatchDelegate:["0xdc4fcda7"],Delegate:["0x026e402b"],UndelegateAll:["0xb302f393"],SetAutoClaiming:["0xe72dcdbb"],EnableDelegationAccount:["0xf0977215"],Deposit:["0xd0e30db0"],CastVote:["0x56781388"],Withdraw:["0x2e1a7d4d"],SetClaimExecutors:["0x9119c494"],Transfer:["0x"]},actions=["BUY","SELL","PAY","MINING","SENDFEE","REDUCE","BONUS","LENDING","STAKING","CASH","BORROW","RETURN","LOSS"],flareApi="https://flare-explorer.flare.network/api",bbPriceUrl="https://public.bitbank.cc/flr_jpy/candlestick/1min/";function startDate(){inputStartDate.value?inputEndDate.min=inputStartDate.value:inputEndDate.min=minDate}function endDate(){inputEndDate.value?inputStartDate.max=inputEndDate.value:inputStartDate.max=""}function start(){allTx=[],blockNumArr=[],endtimestamp=starttimestamp=waddress="",waddress=inputWaddress.value;var e=inputStartDate.value,t=inputEndDate.value;if(e&&(startUnixtime=convertToUnixTime(e),starttimestamp="&starttimestamp="+startUnixtime),t&&(endUnixtime=convertToUnixTime(t)+86400,endtimestamp="&endtimestamp="+endUnixtime),42==waddress.length){for(;dataTable.firstChild;)dataTable.removeChild(dataTable.firstChild);numTx.textContent="0",numTt.textContent="0",numBl.textContent="0",generate.classList.add("btn-secondary"),generate.classList.remove("btn-warning"),generate.classList.add("disabled"),dlbtnM.classList.add("btn-secondary"),dlbtnM.classList.remove("btn-warning"),dlbtnM.classList.add("disabled"),dlbtn.classList.add("btn-secondary"),dlbtn.classList.remove("btn-warning"),dlbtn.classList.add("disabled"),loading.classList.remove("pre-load"),getTx(waddress,allTx,blockNumArr)}else alert("Wrong address length.\nCheck wallet address.")}function getTx(n,r,i){fetch("".concat(flareApi,"?module=account&action=txlist&address=").concat(n).concat(starttimestamp).concat(endtimestamp)).then(function(e){return e.json()}).then(function(e){var t=e.result;t.forEach(function(e){e.dataSource="transactions",r.push(e),i.push(e.blockNumber)});for(var a=1;a<=t.length;a++)!function(e){setTimeout(function(){numTx.textContent=e},e*delayCount)}(a);getTt(n,r,i)})}function getTt(e,r,i){fetch("".concat(flareApi,"?module=account&action=tokentx&address=").concat(e).concat(starttimestamp).concat(endtimestamp)).then(function(e){return e.json()}).then(function(e){var t=e.result;t.forEach(function(e){Number(e.timeStamp)>=Number(startUnixtime)&&Number(e.timeStamp)<=Number(endUnixtime)&&-1===i.indexOf(e.blockNumber)&&("FLR"==e.tokenSymbol||"WFLR"==e.tokenSymbol)&&(r.push(e),i.push(e.blockNumber))});for(var a=1;a<=t.length;a++)!function(e){setTimeout(function(){numTt.textContent=e},e*delayCount)}(a);for(var n=1;n<=i.length;n++)!function(e){setTimeout(function(){numBl.textContent=e},e*delayCount)}(n);allTxAjust(r)})}function allTxAjust(e){e.sort(function(e,t){return e.blockNumber-t.blockNumber}),e.forEach(function(a){var e=new Date(1e3*a.timeStamp);a.Timestamp=convertToJapanDateTime(e,"YMDHMS"),a.unixtimeSec=e.setSeconds(0),a.ymd=convertToJapanDateTime(a.unixtimeSec,"YMD"),a.Source="flare.network",a.Base="FLR",a.Volume=0,a.Price="",a.Counter="JPY",a.FeeCcy="FLR",a.Comment=a.hash,a.candlesticks={},a.priceAverage=0,a.Fee=division10p18fixed9(a.gasPrice*a.gasUsed),a.Method="UNKNOWN",a.methodId=a.input.slice(0,10),a.logs=[];for(var n=0,r=Object.entries(methodId);n<r.length;n++)!function(){var e=_slicedToArray(r[n],2),t=e[0];e[1].forEach(function(e){a.methodId==e&&(a.Method=t)})}()}),getLogsPrice(e)}function getLogsPrice(a){var n=0,r=a.length;!function t(){var e;n===r?dlBtnActive():(e=a[n].hash,fetch("".concat(flareApi,"?module=transaction&action=gettxinfo&txhash=").concat(e)).then(function(e){return e.json()}).then(function(e){"transactions"==a[n].dataSource&&(a[n].logs=e.result.logs),fetch("".concat(bbPriceUrl).concat(a[n].ymd)).then(function(e){return e.json()}).then(function(e){1==e.success&&e.data.candlestick[0].ohlcv.forEach(function(e){e[5]==a[n].unixtimeSec&&(a[n].candlesticks=e,a[n].priceAverage=Number(((Number(e[0])+Number(e[1])+Number(e[2])+Number(e[3]))/4).toFixed(9)))}),tableRender(a[n]),progress(++n,blockNumArr.length),setTimeout(t,delayMS)})}))}()}function tableRender(a){switch(a.Method){case"Claim":a.logs[0]&&a.logs.forEach(function(e){var t=e.topics[0].slice(0,10);-1!==methodId.logAutoClaim.indexOf(t)&&(a.Volume=division10p18fixed9(hexConvert(e.data))),-1!==methodId.logOhterClaim.indexOf(t)&&(a.Volume=division10p18fixed9(hexConvert(e.data.slice(e.data.length-64))))});break;case"SetAutoClaiming":a.Fee=a.Fee+division10p18fixed9(a.value);break;case"AutoClaim":a.Volume=division10p18fixed9(a.value);break;case"Withdraw":a.Volume=division10p18fixed9(hexConvert(a.input.slice(a.input.length-16)));break;case"Deposit":a.Volume=division10p18fixed9(a.value);break;case"Transfer":a.Volume=division10p18fixed9(a.value),waddress.toUpperCase()==a.from.toUpperCase()?(a.Volume=-a.Volume,a.Action="PAY"):(a.Action="BONUS",a.Fee=0)}switch(a.Method){case"Claim":case"AutoClaim":a.Action="MINING";break;case"BatchDelegate":case"Delegate":case"UndelegateAll":case"SetAutoClaiming":case"EnableDelegationAccount":case"CastVote":case"SetClaimExecutors":case"Withdraw":case"Deposit":a.Action="SENDFEE";break;case"UNKNOWN":a.Action="CASH"}var e=document.createElement("tr"),t=document.createElement("td");switch(t.innerHTML=a.Method,t.classList.add("text-center"),a.Method){case"BatchDelegate":case"Delegate":t.classList.add("bg-primary"),t.classList.add("text-white");break;case"Claim":case"AutoClaim":t.classList.add("bg-warning"),t.classList.add("text-dark");break;case"Deposit":t.classList.add("bg-success"),t.classList.add("text-white"),t.insertAdjacentText("beforeend"," (Wrapped)");break;case"Withdraw":t.classList.add("bg-success"),t.classList.add("text-white"),t.insertAdjacentText("beforeend"," (Unwrapped)");break;default:t.classList.add("bg-light"),t.classList.add("text-dark")}var n=document.createElement("td");n.classList.add("text-start"),n.innerHTML=a.Timestamp;var r=document.createElement("td"),i=document.createElement("select");i.classList.add("form-select"),actions.forEach(function(e){var t=document.createElement("option");t.value=e,(t.text=e)==a.Action&&(t.selected=!0),i.appendChild(t)}),i.addEventListener("change",function(){a.Action=this.value}),r.appendChild(i);var o=document.createElement("td");o.classList.add("text-start");var c=document.createElement("span");c.classList.add("material-symbols-outlined"),c.innerHTML="link";var s=document.createElement("a");s.href="https://flare-explorer.flare.network/tx/"+a.hash,s.target="_blank",s.appendChild(c),s.appendChild(document.createTextNode(a.hash)),o.appendChild(s);var d=document.createElement("td");d.innerHTML=a.Volume;var l=document.createElement("td");l.innerHTML=a.Fee;var u=document.createElement("td");u.innerHTML=a.priceAverage;var m=document.createElement("td");a.FeeJPY=(a.Fee*a.priceAverage).toFixed(9),m.innerHTML=a.FeeJPY;var p=document.createElement("td");a.VolumeJPY=(a.Volume*a.priceAverage).toFixed(9),0!=a.VolumeJPY&&"Withdraw"!=a.Method&&"Deposit"!=a.Method||(a.VolumeJPY=0),p.innerHTML=a.VolumeJPY,e.appendChild(t),e.appendChild(n),e.appendChild(r),e.appendChild(o),e.appendChild(d),e.appendChild(l),e.appendChild(u),e.appendChild(m),e.appendChild(p),dataTable.prepend(e)}function progress(e,t){var a=Math.ceil(e/t*100),n=a+"%";progressBar.setAttribute("aria-valuenow",a),progressBar.style.width=n,loadingPercent.innerHTML="100%"==n?"Complete.":n}function dlBtnActive(){dlbtnM.classList.remove("btn-secondary"),dlbtnM.classList.add("btn-warning"),dlbtnM.classList.remove("disabled"),dlbtn.classList.remove("btn-secondary"),dlbtn.classList.add("btn-warning"),dlbtn.classList.remove("disabled"),setTimeout(function(){loading.classList.add("pre-load"),generate.classList.remove("btn-secondary"),generate.classList.add("btn-warning"),generate.classList.remove("disabled")},2e3),setTimeout(function(){progressBar.setAttribute("aria-valuenow","0"),progressBar.style.width="0%",loadingPercent.innerHTML="0%"},2500)}function division10p18fixed9(e){var t=Number((e/1e9).toFixed(9));return Number((t/1e9).toFixed(9))}function convertToJapanDateTime(e,t){var a=new Date(e);"YMDHMS"==t?a.setHours(a.getHours()):"YMD"==t&&a.setHours(a.getHours()-9);var n=a.getFullYear(),r=(a.getMonth()+1).toString().padStart(2,"0"),i=a.getDate().toString().padStart(2,"0"),o=a.getHours().toString().padStart(2,"0"),c=a.getMinutes().toString().padStart(2,"0"),s=("0"+a.getSeconds()).slice(-2);return"YMDHMS"==t?"".concat(n,"-").concat(r,"-").concat(i," ").concat(o,":").concat(c,":").concat(s):"YMD"==t?"".concat(n).concat(r).concat(i):void 0}function hexConvert(e){return parseInt(e,16)}function convertToUnixTime(e){return Math.floor(new Date(e).getTime()/1e3)}function csvDownload(e,t){var a=Object.keys(e[0]).join(",")+"\n"+e.map(function(e){return Object.values(e).join(",")}).join("\n"),n=new Blob([a],{type:"text/csv"}),r=document.createElement("a");r.href=URL.createObjectURL(n),r.download=t,r.click(),r.remove()}function downloadCSVforCT(){var e=JSON.parse(JSON.stringify(allTx)),n=[];e.forEach(function(t){var a={};csvSort.forEach(function(e){t.hasOwnProperty(e)&&(a[e]=t[e])}),n.push(a)}),csvDownload(n,"flr-csv-for-cryptact.csv")}function downloadCSVMore(){var e=JSON.parse(JSON.stringify(allTx)),n=[];e.forEach(function(t){var a={};csvSortMore.forEach(function(e){t.hasOwnProperty(e)&&(a[e]=t[e])}),n.push(a)}),csvDownload(n,"flr-csv-more.csv")}inputStartDate.addEventListener("change",function(){startDate()}),clearStartDate.addEventListener("click",function(){inputStartDate.value="",startDate()}),inputEndDate.addEventListener("change",function(){endDate()}),clearEndDate.addEventListener("click",function(){inputEndDate.value="",endDate()});