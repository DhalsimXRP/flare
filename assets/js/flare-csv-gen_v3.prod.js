"use strict";function _slicedToArray(e,t){return _arrayWithHoles(e)||_iterableToArrayLimit(e,t)||_nonIterableRest()}function _nonIterableRest(){throw new TypeError("Invalid attempt to destructure non-iterable instance")}function _iterableToArrayLimit(e,t){if(Symbol.iterator in Object(e)||"[object Arguments]"===Object.prototype.toString.call(e)){var n=[],a=!0,r=!1,o=void 0;try{for(var i,c=e[Symbol.iterator]();!(a=(i=c.next()).done)&&(n.push(i.value),!t||n.length!==t);a=!0);}catch(e){r=!0,o=e}finally{try{a||null==c.return||c.return()}finally{if(r)throw o}}return n}}function _arrayWithHoles(e){if(Array.isArray(e))return e}function _toConsumableArray(e){return _arrayWithoutHoles(e)||_iterableToArray(e)||_nonIterableSpread()}function _nonIterableSpread(){throw new TypeError("Invalid attempt to spread non-iterable instance")}function _iterableToArray(e){if(Symbol.iterator in Object(e)||"[object Arguments]"===Object.prototype.toString.call(e))return Array.from(e)}function _arrayWithoutHoles(e){if(Array.isArray(e)){for(var t=0,n=new Array(e.length);t<e.length;t++)n[t]=e[t];return n}}var allTx,dataTable=document.getElementById("transaction-data"),loading=document.getElementById("loading"),dlbtn=document.getElementById("download"),dlbtnM=document.getElementById("download-more"),csvSort=["Timestamp","Action","Source","Base","Volume","Price","Counter","Fee","FeeCcy","Comment"],csvSortMore=["Timestamp","Method","Source","Base","Volume","Counter","Fee","FeeCcy","hash","gas","gasPrice","gasUsed","priceAverage","FeeJPY","VolumeJPY"],methodId={Claim:["0xb2c12192","0xb2af870a"],AutoClaim:["0x6a761202"],logAutoClaim:["0xddf252ad"],BatchDelegate:["0xdc4fcda7"],Delegate:["0x026e402b"],UndelegateAll:["0xb302f393"],SetAutoClaiming:["0xe72dcdbb"],EnableDelegationAccount:["0xf0977215"],Deposit:["0xd0e30db0"],CastVote:["0x56781388"],Withdraw:["0x2e1a7d4d"],SetClaimExecutors:["0x9119c494"],Transfer:["0x"],logOhterClaim:["0x6ec68517"]},actions=["BUY","SELL","PAY","MINING","SENDFEE","REDUCE","BONUS","LENDING","STAKING","CASH","BORROW","RETURN","LOSS"],flareApi="https://flare-explorer.flare.network/api",bbPriceUrl="https://public.bitbank.cc/flr_jpy/candlestick/1min/";function render(){for(;dataTable.firstChild;)dataTable.removeChild(dataTable.firstChild);loading.classList.remove("d-none"),getData(document.getElementById("waddress").value)}function getJsonTx(e){var t="".concat(flareApi,"?module=account&action=txlist&address=").concat(e);return fetch(t).then(function(e){return e.json()})}function getJsonTt(e){var t="".concat(flareApi,"?module=account&action=tokentx&address=").concat(e);return fetch(t).then(function(e){return e.json()})}function getJsonDetailTx(e){var t="".concat(flareApi,"?module=transaction&action=gettxinfo&txhash=").concat(e);return fetch(t).then(function(e){return e.json()})}function getJsonBb(e){var t="".concat(bbPriceUrl).concat(e.ymd);return fetch(t).then(function(e){return e.json()})}function getData(o){return getJsonTx(o).then(function(e){var t=e.result.map(function(t){return getJsonDetailTx(t.hash).then(function(e){return t.logs=e.result.logs,t})});return Promise.all(t).then(function(e){return allTx=e,getJsonTt(o)})}).then(function(e){var t=e.result.map(function(t){return new Promise(function(e){e(t)})});return Promise.all(t).then(function(e){for(var t=0;t<e.length;t++){var n=e[t].input.slice(0,10);-1===methodId.AutoClaim.indexOf(n)&&(e.splice(t,1),t--)}return 0!=e.length?[].concat(_toConsumableArray(allTx),_toConsumableArray(e)):allTx})}).then(function(t){t.forEach(function(n){var e=new Date(1e3*n.timeStamp);n.Timestamp=convertToJapanDateTime(e,"YMDHMS"),n.unixtimeSec=e.setSeconds(0),n.ymd=convertToJapanDateTime(n.unixtimeSec,"YMD"),n.Source="flare.network",n.Base="FLR",n.Volume=0,n.Price="",n.Counter="JPY",n.FeeCcy="FLR",n.Comment=n.hash,n.candlesticks={},n.priceAverage=0,n.Fee=division10p18fixed9(n.gasPrice*n.gasUsed),n.Method="UNKNOWN",n.methodId=n.input.slice(0,10);for(var a=0,r=Object.entries(methodId);a<r.length;a++)!function(){var e=_slicedToArray(r[a],2),t=e[0];e[1].forEach(function(e){n.methodId==e&&(n.Method=t)})}();switch(n.Method){case"Claim":n.logs[0]&&n.logs.forEach(function(e){var t=e.topics[0].slice(0,10);-1!==methodId.logAutoClaim.indexOf(t)&&(n.Volume=division10p18fixed9(hexConvert(e.data))),-1!==methodId.logOhterClaim.indexOf(t)&&(n.Volume=division10p18fixed9(hexConvert(e.data.slice(e.data.length-64))))});break;case"AutoClaim":n.Volume=division10p18fixed9(n.value);break;case"Withdraw":n.Volume=division10p18fixed9(hexConvert(n.input.slice(n.input.length-16)));break;case"Deposit":n.Volume=division10p18fixed9(n.value);break;case"Transfer":n.Volume=division10p18fixed9(n.value),o.toUpperCase()==n.from.toUpperCase()?(n.Volume=-n.Volume,n.Action="PAY"):(n.Action="BONUS",n.Fee=0)}switch(n.Method){case"Claim":case"AutoClaim":n.Action="MINING";break;case"BatchDelegate":case"Delegate":case"UndelegateAll":case"SetAutoClaiming":case"EnableDelegationAccount":case"CastVote":case"SetClaimExecutors":case"Withdraw":case"Deposit":n.Action="SENDFEE";break;case"UNKNOWN":n.Action="CASH"}}),t.sort(function(e,t){return t.blockNumber-e.blockNumber});var e=t.map(function(t){return getJsonBb(t).then(function(e){return 1==e.success&&e.data.candlestick[0].ohlcv.forEach(function(e){e[5]==t.unixtimeSec&&(t.candlesticks=e,t.priceAverage=Number(((Number(e[0])+Number(e[1])+Number(e[2])+Number(e[3]))/4).toFixed(9)))}),t})});return Promise.all(e).then(function(e){return t=e})}).then(function(e){tableRender(e)})}function tableRender(e){e.forEach(function(n){var e=document.createElement("tr"),t=document.createElement("td");switch(t.innerHTML=n.Method,t.classList.add("text-center"),n.Method){case"BatchDelegate":case"Delegate":t.classList.add("bg-primary"),t.classList.add("text-white");break;case"Claim":case"AutoClaim":t.classList.add("bg-warning");break;case"Deposit":t.classList.add("bg-success"),t.classList.add("text-white"),t.insertAdjacentText("beforeend"," (Wrapped)");break;case"Withdraw":t.classList.add("bg-success"),t.classList.add("text-white"),t.insertAdjacentText("beforeend"," (Unwrapped)");break;default:t.classList.add("bg-light")}var a=document.createElement("td");a.classList.add("text-start"),a.innerHTML=n.Timestamp;var r=document.createElement("td"),o=document.createElement("select");o.classList.add("form-select"),actions.forEach(function(e){var t=document.createElement("option");t.value=e,(t.text=e)==n.Action&&(t.selected=!0),o.appendChild(t)}),o.addEventListener("change",function(){n.Action=this.value}),r.appendChild(o);var i=document.createElement("td");i.classList.add("text-start");var c=document.createElement("span");c.classList.add("material-symbols-outlined"),c.innerHTML="link";var l=document.createElement("a");l.href="https://flare-explorer.flare.network/tx/"+n.hash,l.target="_blank",l.appendChild(c),l.appendChild(document.createTextNode(n.hash)),i.appendChild(l);var s=document.createElement("td");s.innerHTML=n.Volume;var d=document.createElement("td");d.innerHTML=n.Fee;var u=document.createElement("td");u.innerHTML=n.priceAverage;var m=document.createElement("td");n.FeeJPY=(n.Fee*n.priceAverage).toFixed(9),m.innerHTML=n.FeeJPY;var f=document.createElement("td");n.VolumeJPY=(n.Volume*n.priceAverage).toFixed(9),0!=n.VolumeJPY&&"Withdraw"!=n.Method&&"Deposit"!=n.Method||(n.VolumeJPY=0),f.innerHTML=n.VolumeJPY,e.appendChild(t),e.appendChild(a),e.appendChild(r),e.appendChild(i),e.appendChild(s),e.appendChild(d),e.appendChild(u),e.appendChild(m),e.appendChild(f),dataTable.appendChild(e)}),loading.classList.add("d-none"),dlBtnActive()}function dlBtnActive(){loading.classList.add("d-none"),dlbtnM.classList.remove("btn-secondary"),dlbtnM.classList.add("btn-warning"),dlbtnM.classList.remove("disabled"),dlbtn.classList.remove("btn-secondary"),dlbtn.classList.add("btn-warning"),dlbtn.classList.remove("disabled")}function division10p18fixed9(e){var t=Number((e/1e9).toFixed(9));return Number((t/1e9).toFixed(9))}function convertToJapanDateTime(e,t){var n=new Date(e);"YMDHMS"==t?n.setHours(n.getHours()):"YMD"==t&&n.setHours(n.getHours()-9);var a=n.getFullYear(),r=(n.getMonth()+1).toString().padStart(2,"0"),o=n.getDate().toString().padStart(2,"0"),i=n.getHours().toString().padStart(2,"0"),c=n.getMinutes().toString().padStart(2,"0"),l=("0"+n.getSeconds()).slice(-2);return"YMDHMS"==t?"".concat(a,"-").concat(r,"-").concat(o," ").concat(i,":").concat(c,":").concat(l):"YMD"==t?"".concat(a).concat(r).concat(o):void 0}function hexConvert(e){return parseInt(e,16)}function csvDownload(e,t){var n=Object.keys(e[0]).join(",")+"\n"+e.map(function(e){return Object.values(e).join(",")}).join("\n"),a=new Blob([n],{type:"text/csv"}),r=document.createElement("a");r.href=URL.createObjectURL(a),r.download=t,r.click(),r.remove()}function downloadCSVforCT(){var e=JSON.parse(JSON.stringify(allTx)),a=[];e.forEach(function(t){var n={};csvSort.forEach(function(e){t.hasOwnProperty(e)&&(n[e]=t[e])}),a.push(n)}),csvDownload(a,"flr-csv-for-cryptact.csv")}function downloadCSVMore(){var e=JSON.parse(JSON.stringify(allTx)),a=[];e.forEach(function(t){var n={};csvSortMore.forEach(function(e){t.hasOwnProperty(e)&&(n[e]=t[e])}),a.push(n)}),csvDownload(a,"flr-csv-more.csv")}