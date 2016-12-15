let ipc = require('electron').ipcRenderer;
let request = require('request');
let appPath = ipc.sendSync('getAppPath');
let path = require('path');
let fs = require('fs');
window.addEventListener('load', () => {
	document.getElementById('save').addEventListener('click', saveConfig);
	document.getElementById('check').addEventListener('click', checkConfig);
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
	fs.writeFileSync(path.join(appPath, 'config.json'), JSON.stringify(config));
}
function checkConfig(){
	document.getElementById('loading').style.display = 'block';
	let config = {};
	config.user = document.querySelector('[name="user"').value;
	config.password = document.querySelector('[name="password"').value;
	config.ip = document.querySelector('[name="ip"').value;
	config.inetInterface =  document.querySelector('[name="inetInterface"').value;
	config.interval = document.querySelector('[name="interval"').value;
	request({
		interval: 500,
		url: `http://${config.ip}/ci`,
	    method: 'POST',
	    auth: {
	      'user': config.user,
	      'pass': config.password,
	      sendImmediately: false
	    },
	    headers: {
	      'Content-Type': 'application/xml'
	    },
	    body: `<packet ref="/">
      <request id="1" ref="former.status[ready]/former.status[load]">
        <command name="show interface stat">
          <name>${config.inetInterface}</name>
        </command>
      </request></packet>`
	}, (error, response, body) => {
		document.getElementById('loading').style.display = 'none';
	    if(error || response.statusCode != 200){
	      console.log('Code : ' + (response && response.statusCode));
	      console.log('error : ' + error);
	      console.log('body : ' + body);
	      return alert('Error:' + (error || body));
	    }
	    else{
	    	alert('All ok');
	    }
	})
}
/*<request id="2" ref="former.ctrls[ready]/former.ctrls[load]">
  <command name="show interface">
  </command>
</request>*/