var util = require('mace');
var fetch = require('http-fetch');
var http = require('http').createServer(function (req, res) {

  fetch(req, util.use(__dirname + '/url.js'), function (err, data, nsres) {
    if (err) {
      res.statusCode = 500;
      res.write('['+err.stack.split(/\n\r*/g).join(',') + ']')
      res.end();
      return ;
    }
    res.statusCode = nsres.statusCode;
    util.each(nsres.headers,function (val, name) {
      res.setHeader(name, val);
    });
    res.write(data);
    res.end();
  });
}).listen(10000, function () {
  util.log('server run : http://127.0.0.1:10000 ');  
});