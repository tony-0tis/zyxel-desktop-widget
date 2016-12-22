let request = require('request');
let parseString = require('xml2js').parseString;

let bits_orders = ["бит/с", "кбит/с", "Мбит/с", "Гбит/с", "Тбит/с"];
let prevStat = {};

exports.req = function(settings, config, cb){
	let postOptions = getOptions(settings, config);
	request(postOptions, (error, response, body) => {
		if(error || response.statusCode != 200){
			console.log('Code : ' + (response && response.statusCode));
			console.log('error : ' + error);
			console.log('body : ' + body);
			return cb(error);
		}

		let bodyLength = body.length;

		parseString(body, (err, res) => {
			let result = {
				timestamp: Date.now(),
				stats: {}
			};
			try{
				res = res.packet.response;
				if(config.updateConfig){
					config.updateConfig = false;

					if(res[0]){
						config.ports = {};
						res[0].port.splice(1).map(p => {
							config.ports[p.index[0]] = {
								on: false
							};
							if(p.link[0] == 'up'){
								config.ports[p.index[0]].on = true;
							}
						});
					}
					if(res[1]){
						res[1].mactable.map(m => {
							if(m.port[0] != '0'){
								config.ports[m.port[0]] = config.ports[m.port[0]] || {}
								config.ports[m.port[0]].mac = m.mac[0];
							}
						});
					}

					config.users = {};
					if(res[2]){
						config.users = res[2].lease.reduce((res, user) => {
							let mac = user.mac[0];
							res[mac] = user;
							return res;
						}, {});
					}
					result.config = config;
					cb(null, result);
					return;
				}

				if(res[0]){//internet
					let networkLoad = res[0];
					let routerTs = networkLoad.timestamp[0] || Date.now()/1e3;
					prevStat.Internet = prevStat.Internet || {rx: {}, tx: {}};

					result.stats.Internet = bitsSec(
						routerTs,
						networkLoad.rxbytes[0],
						networkLoad.txbytes[0],
						prevStat.Internet,
						'Internet'
					);
				}

				let resId = 1;
				res[1] = res[1] || {station: {}};
				for(let i in config.ports){
					let port = config.ports[i];
					if(!port.on){
						continue;
					}
					resId++;
					let client = res[resId];
					if(!client){
						continue;
					}

					// architecture feature - txbytes for internet port is incoming, for lan ports the same property is outcoming from router to client, for client txbytes will remain incoming traffic
					[client.rxbytes, client.txbytes] = [client.txbytes, client.rxbytes];

					client.mac = [port.mac];
					res[1].station.push(client);
				}

				if(res[1]){
					let cutTs = Date.now()/1e3;
					res[1].station.forEach(client => {
						let mac = client.mac[0];
						if(!mac){
							result.updateConfig = true;
							return;
						}

						let user = config.users[mac] || {name: [mac]};
						prevStat[mac] = prevStat[mac] || {rx: {}, tx: {}}

						result.stats[(user.name && user.name[0] || user.hostname[0] || user.ip[0])] = bitsSec(
							cutTs,
							client.rxbytes[0],
							client.txbytes[0],
							prevStat[mac],
							mac
						);
					});
				}
			}catch(e){
				return cb(e);
			}

			cb(null, result);
		});
	});
}

function getOptions(settings, config){
	let body = '<packet ref="/">';
	if(config.updateConfig){
		body += `<request id="1" ref="former.list[load]">
				<command name="show interface">
					<name>GigabitEthernet0</name>
				</command>
			</request><request id="2" ref="former.list[load]">
				<command name="show interface mac">
					<name>GigabitEthernet0</name>
				</command>
			</request><request id="3" ref="former.ctrls[load]">
				<command name="show ip dhcp bindings">
				</command>
			</request>`;
	}
	else{
		body += `<request id="1" ref="former.status[ready]/former.status[load]">
			<command name="show interface stat">
				<name>${settings.inetInterface}</name>
			</command>
		</request>`;
		body += `<request id="2" ref="former.ctrls[load]">
			<command name="show associations">
			</command>
		</request>`;
		if(config.ports[1].on == true && config.ports[1].mac){
			body += `<request id="3" ref="former.status[ready]/former.status[load]">
				<command name="show interface stat">
					<name>1</name>
				</command>
			</request>`;
		}
		if(config.ports[2].on == true && config.ports[2].mac){
			body += `<request id="4" ref="former.status[ready]/former.status[load]">
				<command name="show interface stat">
					<name>2</name>
				</command>
			</request>`;
		}
		if(config.ports[3].on == true && config.ports[3].mac){
			body += `<request id="5" ref="former.status[ready]/former.status[load]">
				<command name="show interface stat">
					<name>3</name>
				</command>
			</request>`;
		}
		if(config.ports[4].on == true && config.ports[4].mac){
			body += `<request id="6" ref="former.status[ready]/former.status[load]">
				<command name="show interface stat">
					<name>4</name>
				</command>
			</request>`;
		}
	}
	body += '</packet>';

	return {
		url: `http://${settings.ip}/ci`,
		method: 'POST',
		auth: {
			'user': settings.user,
			'pass': settings.password,
			sendImmediately: false
		},
		headers: {
			'Content-Type': 'application/xml'
		},
		body: body
	};/*<request id="1">
	<parse><parse></request>*/
}

function bitsSec(ts, sin, out, stats, mac) {
	var speedIn = 0;
	var speedOut = 0;
	
	if (stats.ts && ts - stats.ts < 1e7) {
		var deltaIn = sin - stats.in,
				deltaOut = out - stats.out,
				td = ts - stats.ts;
		
		if (deltaIn >= 0 && td >= 0){
			speedIn = td ? (8 * deltaIn / td) | 0 : 0;
		}
		if(deltaOut >= 0 && td >= 0){
			speedOut = td ? (8 * deltaOut / td) | 0 : 0;
		}
	}

	stats.in = sin;
	stats.out = out;
	stats.ts = ts;

	return{
		in: speedIn,
		out: speedOut,
		mac: mac
	};
}