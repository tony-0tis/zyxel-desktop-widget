let ipc = require('electron').ipcRenderer;
let settings = ipc.sendSync('getSettings');
let curl = require('../scripts/curl.js');

let d = document;
let get = d.getElementById.bind(d);
let query = d.querySelector.bind(d);
Element.prototype.query = function(...args){
	this.querySelector.apply(this, args)
};

var smoothie = new SmoothieChart({
	millisPerPixel:70,
	grid:{strokeStyle:'rgba(119,119,119,0.66)',verticalSections:6,borderVisible:false},
	labels:{fillStyle:'#c0c0c0',fontSize:9,precision:0}}
);

window.addEventListener('load', () => {
	get('bar').width = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
	get('bar').height = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
	
	setTimeout(() => {
	get('bar').width = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
	get('bar').height = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
	}, 100);

	smoothie.streamTo(document.getElementById("bar"), 1000);
	let config = {
		updateConfig: true
	};
	setInterval(() => {
		config.updateConfig = true
	}, 1000 * 60 * 5);
	let req = () => {
		curl.req(settings, Object.assign({}, config), (err, res) => {
			if(err){
				console.log(err);
				setTimeout(req, settings.interval || 1000);
				return;
			}

			if(res.config){
				config = res.config;
				setTimeout(req, 1);
			}
			else{
				if(res.updateConfig){
					config.updateConfig = true;
				}

				for(var i in res.stats){
					fillChartData(i, res.stats[i], res.timestamp);
				}
				setTimeout(req, settings.interval || 1000);
			}
		});
	};
	req()
});
window.addEventListener("resize", () => {
	console.info('resize');
	get('bar').width = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
	get('bar').height = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
});
document.addEventListener('click', () => {
	get('legend').style.display = get('legend').style.display == 'block' ? 'none' : 'block';
});

let lines = {};
let lineConfig = {
	Internet: {
		lineWidth: 3.0,
		strokeStyle: '#ff0000'
	}
};
let dir = 'in';
window.oncontextmenu = () => {
	dir = dir == 'in' ? 'out' : 'in';
	get('type').innerHTML = dir;
};
function fillChartData(type, stat, time){
	if(!lines[type]){
		lines[type] = new TimeSeries();
		let config = lineConfig[type] || {strokeStyle: "hsl(" + Math.random() * 360 + ", 100%, 75%)", lineWidth: 2};
		smoothie.addTimeSeries(lines[type], config);
		
		let tr = d.createElement('tr');
		tr.id = "dev_" + stat.mac;
		tr.innerHTML = `
			<td class="name" style="color:${config.strokeStyle}">${type}</td>
			<td class="in">0</td>
			<td class="out">0</td>
		`;
		get('legend').querySelector('.list').appendChild(tr);
	}
	lines[type].append(time, stat[dir] / 1024);
	let el = get('dev_' + stat.mac);
	if(el){
		el.querySelector('.in').innerHTML = parseInt(stat.in / 1024);
		el.querySelector('.out').innerHTML = parseInt(stat.out / 1024);
	}
}
