var platform = process.platform;
var fs = require("fs");
var config = require('../config.js');
var output = {};
var exec = require("child_process").exec;
var path = require("path");
var _dnsCache = {
    "length": 0
}

output.platform = /^win/.test(platform)? 'win' : /^darwin/.test(platform)? 'mac' : 'linux' + (process.arch == 'ia32' ? '32' : '64');

switch(output.platform) {
	case "win":
        var programFile = process.arch == 'x64' ? "C:\\Program Files (x86)\\" : "C:\\Program Files\\";

		output.systemHostFilePath = "C:\\Windows\\System32\\drivers\\etc\\hosts";
		output.defaultChromePath = programFile + "Google\\Chrome\\Application\\chrome.exe";
		output.startChrome = function(cb) {
			var command;
			var localStorage = global.window.localStorage;
			var chromePath = localStorage.getItem("chromePath") || output.defaultChromePath;
	        var port = localStorage.getItem("serverPort") || 9393;
            var gui = global.window.nwDispatcher.requireNwGui();
            var devPath = path.join( gui.App.dataPath , "/chrome-dev");

            if (!fs.existsSync(chromePath)) {
                global.window.alert(chromePath + "文件不存在，请检查设置中的chrome安装路径");
                cb({message: "文件不存在"});
                return;
            }
            if (/[\u4E00-\u9FFF]/.test(chromePath)) {
                global.window.alert("存在中文路径，无法启动");
                cb({message: "存在中文路径"});
                return;
            }
	        if (chromePath) {
	            var arr = chromePath.split('\\');
	            var exeName = arr.pop();

	            chromePath = arr.join('\\');

	            command = 'start \/d "' + chromePath + '" ' + exeName + ' --proxy-server="http://127.0.0.1:' + port +'"  --user-data-dir='+ devPath +'  --lang=local  ' + config.openPage;
	        }
	        else {
	            command = 'start chrome --proxy-server="http://127.0.0.1:' + port + '" --user-data-dir='+ devPath + ' --lang=local  ' +  config.openPage;
	        }
            console.log(command);
            exec(command, cb);
		}

        output.setSystemProxy = function(cb) {
            //enable
            var localStorage = global.window.localStorage;
            var port = localStorage.getItem("serverPort") || 9393;
            var enableCmd = 'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" ^ /v ProxyEnable /t REG_DWORD /d 1 /f';
            var changeAddress = 'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" ^/v ProxyServer /t REG_SZ /d 127.0.0.1:' + port + ' /f';
            exec(changeAddress, function(err) {
               if (err) {
                   console.log(err);
               }
               else {
                   exec(enableCmd, cb);
               }
            });
        }
        output.disableSystemProxy = function(cb) {
            var disableCmd = 'reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings" ^ /v ProxyEnable /t REG_DWORD /d 0 /f';
            exec(disableCmd, cb);
        }
	break;

	case "mac":
		output.systemHostFilePath = "/etc/hosts";
        output.defaultChromePath = "/Applications/Google\\ Chrome.app";

        output.startChrome = function (cb) {
            var localStorage = global.window.localStorage;
            var chromePath = localStorage.getItem("chromePath") || output.defaultChromePath;
            var port = localStorage.getItem("serverPort") || 9393;
            var gui = global.window.nwDispatcher.requireNwGui();
            var devPath = path.join(gui.App.dataPath, "/chrome-dev");

            command = chromePath + '/Contents/MacOS/Google\\ Chrome' + ' --proxy-server="http://127.0.0.1:' + port + '"  --user-data-dir=' + devPath + '  --lang=local  ' + config.openPage;
            console.log(command);
            exec(command, cb);
        }

        output.sudoPassword = '';

        output.setSystemProxy = function(cb) {
            var port = global.window.localStorage.getItem("serverPort") || 9393;
            _getSudoPassword()
                .then(_getNetWorkService)
                .then(_changeProxy)
                .then(function(stdout) {
                    cb(null, stdout);
                }).catch(function(e) {
                    cb(e);
                });

            function _getNetWorkService(password) {
                var shPath =  path.resolve(__dirname, 'tools/findMacService.sh');
                return new Promise(function(resolve, reject) {
                     exec(shPath, function(err, stdout) {
                        if (err) {
                            reject(err);
                        } else {
                            resolve({
                                password: password,
                                service: stdout
                            });
                        }
                    })
                });
            }

            function _changeProxy(data) {
                var stdout = data.service;
                var password = data.password;

                return new Promise(function(resolve, reject) {
                    stdout = stdout.split('\n')[0];
                    var serviceList = stdout.split(',');
                    var enableCommand = '', disableCommand = '';
                    serviceList.forEach(function(item) {
                        if (item) {
                            enableCommand += `
                                networksetup -setwebproxy '${item}' 127.0.0.1 ${port};
                                networksetup -setsecurewebproxy '${item}' 127.0.0.1 ${port};
                                networksetup -setwebproxystate '${item}' on;
                                networksetup -setsecurewebproxystate '${item}' on;
                            `;
                            disableCommand += `
                                networksetup -setwebproxystate '${item}' off;
                                networksetup -setsecurewebproxystate '${item}' off;
                            `
                        }
                    })
                    enableCommand = "sudo -k -S -s -- '" + enableCommand + "'" ;
                    output.disableCommand = "sudo -k -S -s -- '" + disableCommand + "'" ;
                    var child = exec(enableCommand, function(err, stdout, stderr) {

                        if (err) {
                            reject(err);
                            return;
                        }
                        if (stderr) {
                            reject(stderr);
                            return;
                        }
                        resolve(stdout);
                    }); //黑科技
                    child.stderr.on("data", function(data) {
                        child.stdin.write(password + "\n");
                    });

                })
            }

            function _getSudoPassword() {
                return new Promise(function(resolve, reject) {
                    var $ = global.window.$;
                    var d = global.window.dialog({
                        width: 150,
                        height: 40,
                        title: '请输入sudo密码',
                        content: '<input class="sudo-pass" autofocus type="password" />',
                        okValue: '确定',
                        ok: function () {
                            resolve($(this.node).find('.sudo-pass').val());
                        },
                        cancelValue: '取消',
                        cancel: function () {
                            reject(new Error('没有输入sudo 密码'));
                        }
                    });
                    d.showModal();
                });
            }
        }

        output.disableSystemProxy = function(cb) {
            disableCommand = output.disableCommand;
            var child = exec(disableCommand, function(err, stdout, stderr) {
                if (err) {
                    cb(err);
                    return;
                }
                if (stderr) {
                    cb(stderr);
                    return;
                }
                cb(null, stdout);
            }); //黑科技
            child.stderr.on("data", function(data) {
                child.stdin.write(output.sudoPassword + "\n");
            });
        }
     break;

	case "linux64":
	    output.systemHostFilePath = "/etc/hosts";
	break;
}

output.doDns = function(host, port, cb) {
    if ( !_dnsCache[host] ) {
        //mac host
        var dnsTimeOut = 5000;
        var testTime = new Date();
        var lock = false;
        var timeout = setTimeout(function() {
            if (!lock) {
                lock = true;
                global.window.logger.doLog("warn", host + "dns解析超时");
                cb("timeout");
            }
        }, dnsTimeOut);
        getIP(host, function(err, resultIP) {
            clearTimeout(timeout);
            if (err) {
                cb(err);
            }
            if (resultIP) {
                _dnsCache[host] = resultIP;
                _dnsCache["length"] += 1;
                if (_dnsCache["length"] > 100) {
                    //防止内存占用太多
                    _dnsCache = {"length": 0};
                }
                console.log(host + ":" + port + "被解析到：" + resultIP + ",解析耗时" + (new Date() - testTime));
            }
            if (lock) { //已经超时
                return;
            }
            lock = true;
            cb(null, resultIP);
            global.window.logger.doLog("warn", host + "检测到系统hosts并且被忽略");

        });
    }
    else {
        //缓存命中
        global.window.logger.doLog("warn", host + "检测到系统hosts并且被忽略");
        console.log(host + ":" + port + "命中缓存:" +  _dnsCache[host]);
        cb && cb(null, _dnsCache[host]);
    }
}
function getIP(host, cb) {

    if (output.platform == "win") {
        exec("nslookup " +  host, function (err, stdout){
            if (err) { cb(err); }
            var resultIP;
            stdout = stdout.split(/\r?\n/);
            if (stdout[4] && /Address|Addresses/.test(stdout[4])) {
                var len =  stdout.length;
                for (var i = 4; i < len; i++) {
                    if ( /\d+\.\d+\.\d+\.\d+/.test(stdout[i]) ) {
                        resultIP =  /\d+\.\d+\.\d+\.\d+/.exec(stdout[i])[0];
                        i = len;
                    }
                }
            }
            if (resultIP) {
                cb(null, resultIP);
            }
        });
    }
    else if (output.platform == "mac") {
       exec("host " + host, function (err, stdout){
           if (err) { cb(err); }
           var resultIP;
           stdout = stdout.split('\n');
           for ( var i=0; i< stdout.length; i++) {
               if ( /\d+\.\d+\.\d+\.\d+/.test(stdout[i]) ) {
                   resultIP =  /\d+\.\d+\.\d+\.\d+/.exec(stdout[i])[0];
                   i = stdout.length;
               }
           }
           if (resultIP) {
               cb(null, resultIP);
           }
       });
    }
}

module.exports = output;
