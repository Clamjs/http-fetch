var Util = require('mace');
var Url = require('url');
var Http = require('http');
var Https = require('https');
var debug = Util.debug('HTTP-Fetch');
function resolve (req, urlInfo) {
  var reqUrlInfo = Url.parse(req.url);
  if (!urlInfo || typeof urlInfo === 'string') {
    urlInfo = Url.parse(urlInfo || '');
  }
  var pathname = urlInfo.pathname.slice(1) || reqUrlInfo.pathname.slice(1);
  var hostname = urlInfo.hostname || reqUrlInfo.hostname;
  var port = urlInfo.port || reqUrlInfo.port || 80;
  var search = reqUrlInfo.search || '?';
  var protocol = urlInfo.protocol || reqUrlInfo.protocol || 'http:';
  // 附带参数
  if (urlInfo.query) {
    search += '&' +urlInfo.query;
  }
  urlInfo = {
    pathname: pathname,
    hostname: hostname,
    port: port,
    host: hostname + ':' + port,
    protocol: protocol,
    path: '/' + pathname + search.replace(/^\?\&/,'?')
  };
  var headers = Util.merge({
    'X-Server': 'Clam',
    'X-Server-Version': '1.0.0',
    'X-Proxy-Server': 'HTTP-Fetch',
    'X-Proxy-Version': '1.0.0',
    'X-Forwarded-For': (req.headers['x-forwarded-for'] || '') +
      (req.headers['x-forwarded-for'] ? ',' : '') +
      urlInfo.hostname,
    'X-Forwarded-Port': (req.headers['x-forwarded-port'] || '') +
      (req.headers['x-forwarded-port'] ? ',' : '') +
      urlInfo.port,
    'X-Forwarded-Proto': (req.headers['x-forwarded-proto'] || '') +
      (req.headers['x-forwarded-proto'] ? ',' : '') +
      urlInfo.protocol
  }, req.headers);
  headers.host = urlInfo.host;
  return {
    protocol: protocol,
    agent: false,
    headers: headers,
    host: urlInfo.host,
    hostname: urlInfo.hostname,
    port: urlInfo.port,
    method: req.method,
    path: urlInfo.path
  };
}

function fetch (req, urlInfo, fn) {
  if (fetch.isFetchRequest(req)) {
    // X-Proxy-Server
    Util.error('Circle request with HTTP-Fetch! Request URL: %s', req.url);
    return;
  }
  if (!fn && Util.isFunction(urlInfo)) {
    fn = urlInfo;
    urlInfo = null;
  }
  var options = resolve(req, urlInfo);
  debug('Resolve result: ', options);
  var nsreq = (options.protocol === 'http:' ? Http : Https).request(options, function (nsres) {
    var buffer = [];
    nsres.on('data', function ( chunk ) { buffer.push( chunk ); });
    nsres.on('error', function (e) { fn( e ); });
    nsres.on('end', function () {
      buffer = Util.joinBuffer( buffer );
      fn( null, buffer, nsres );
    });
  });
  nsreq.on('error', function ( e ) { fn(e); });
  req.pipe(nsreq, { end: true });
};
fetch.isFetchRequest = function (req) {
  var headers = req.headers;
  if ((headers['X-Proxy-Server'] || headers['x-proxy-server']) === 'HTTP-Fetch') {
    return true;
  }
  return false;
}
exports = module.exports = fetch;
exports.fetch = fetch;
exports.pipe = function (err, data, nsres, res) {
  if (err) {
    res.statusCode = 500;
    res.write('['+err.stack.split(/\n\r*/g).join(',') + ']')
    res.end();
    return ;
  }
  res.statusCode = nsres.statusCode;
  Util.each(nsres.headers,function (val, name) {
    res.setHeader(name, val);
  });
  res.write(data);
  res.end();
};