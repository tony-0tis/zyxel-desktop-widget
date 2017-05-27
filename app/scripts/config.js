let ipc = require('electron').ipcRenderer;
let request = require('request');
let appPath = ipc.sendSync('getAppPath');
let path = require('path');
let fs = require('fs');
let curl = require('../scripts/curl.js');
window.addEventListener('load', () => {
	document.getElementById('save').addEventListener('click', saveConfig);
	document.getElementById('check').addEventListener('click', checkConfig);
	document.getElementById('getInetInterface').addEventListener('click', selectInterface);
	[...document.getElementById('selectInterface').querySelectorAll('.close')].map(e=>{
		e.addEventListener('click', ()=>{
			document.getElementById('selectInterface').classList.remove('show');
		});
	});
	document.getElementById('selectInterface').querySelector('.save').addEventListener('click', ()=>{
		document.getElementById('selectInterface').classList.remove('show');
		let interface;
		[...document.getElementById('selectInterface').querySelectorAll('.interface')].map(i=>{
			if(i.checked){
				interface = i.value;
			}
		});
		document.querySelector('[name="inetInterface"').value = interface;
	});
	let config;
	try{
		config = fs.accessSync(path.join(appPath, 'config.json'));
	    config = JSON.parse(fs.readFileSync(path.join(appPath, 'config.json')));
	    if(config.user){
	    	document.querySelector('[name="user"').value = config.user;
	    }
	    if(config.password){
	    	document.querySelector('[name="password"').value = config.password;
	    }
	    if(config.ip){
	    	document.querySelector('[name="ip"').value = config.ip;
	    }
	    if(config.inetInterface){
	    	document.querySelector('[name="inetInterface"').value = config.inetInterface;
	    }
	    if(config.interval){
	    	document.querySelector('[name="interval"').value = config.interval;
	    }
	}catch(e){}
});
function saveConfig(){
	let config = {};
	config.user = document.querySelector('[name="user"').value;
	config.password = document.querySelector('[name="password"').value;
	config.ip = document.querySelector('[name="ip"').value;
	config.inetInterface =  document.querySelector('[name="inetInterface"').value;
	config.interval = document.querySelector('[name="interval"').value;
	ipc.send('saveSettings', config);
}
function checkConfig(){
	document.getElementById('loading').style.display = 'block';
	let config = {};
	config.user = document.querySelector('[name="user"').value;
	config.password = document.querySelector('[name="password"').value;
	config.ip = document.querySelector('[name="ip"').value;
	config.inetInterface =  document.querySelector('[name="inetInterface"').value;
	config.interval = document.querySelector('[name="interval"').value;
	curl.req(config, {checkConfig: true}, (err, res)=>{
		document.getElementById('loading').style.display = 'none';
		if(err){
			 return alert('Error:' + err);
		}
		alert('All ok');
	});
}
function selectInterface(){
	document.getElementById('loading').style.display = 'block';
	let config = {};
	config.user = document.querySelector('[name="user"').value;
	config.password = document.querySelector('[name="password"').value;
	config.ip = document.querySelector('[name="ip"').value;
	config.inetInterface =  document.querySelector('[name="inetInterface"').value;
	config.interval = document.querySelector('[name="interval"').value;
	curl.req(config, {getInterfaces: true}, (err, res)=>{
		document.getElementById('loading').style.display = 'none';
		if(err){
			return alert('Error:' + err);
		}
		document.getElementById('selectInterface').classList.add('show');
		document.getElementById('selectInterface').querySelector('.list').innerHTML = res.interfaces
		.filter(i=>['Port','AccessPoint'].indexOf(i.type)==-1)
		.map(i=>`
			<input type="radio" class="interface" name="interface" value="${i.name}"> - ${i.name} (${i.type}) ${i.desc ? '- ' + i.desc : ''}
		`).join('<br>')
	});
}
/*<request id="2" ref="former.ctrls[ready]/former.ctrls[load]">
  <command name="show interface">
  </command>
</request>*/