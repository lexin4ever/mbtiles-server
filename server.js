var http = require('http'),
	MBTiles = require('mbtiles'),
	fs = require('fs');

if (process.argv.length < 3) {
	console.log("Error! Missing TILES filename.\nUsage: node server.js TILES [PORT]");
	process.exit(1);
}

var port = 3000;
if (process.argv.length === 4) {
	port = parseInt(process.argv[3]);
}

var mbtilesLocation = String(process.argv[2]).replace(/\.mbtiles/,'') + '.mbtiles';

var mbtiles;

var readTileFile = function(){
	console.log( "read mbfile" );
	new MBTiles(mbtilesLocation, function(err, tiles) {
		if (err) throw err;
		mbtiles = tiles;
	});
};
readTileFile();
var timer;
fs.watchFile(mbtilesLocation, function(curr,prev) {
	clearTimeout(timer);
	timer = setTimeout(function(){
		readTileFile();
	},120000);
});

http.createServer(function getTile(request, res){
	if (!mbtiles) { // not ready yet, try with small delay
		return setTimeout( function(){
			getTile(request, res);
		}, 10);
	}
	var parts = request.url.match( /\/(\d+)\/(\d+)\/(\d+)\.(.*)/ );
	if (!parts) {
		res.writeHead(404, {'Content-Type': 'text/plain'});
		res.end("404 Not found");
	} else {
		var z = parts[1],
			x = parts[2],
			y = parts[3],
			ext = parts[4];

			switch (ext) {
				case "png":
					mbtiles.getTile(z, x, y, function(err, tile, headers) {
						if (err) {
							res.writeHead(404, {'Content-Type': 'text/plain'});
							res.end('Tile rendering error: ' + err + '\n');
						} else {
							res.writeHead(200, {
								'Content-Type': 'image/png'
//								, 'Cache-Control': 'max-age=' + 60 * 60   // nginx will cache in our case
							});
							res.write(tile);
							res.end();
						}
					});
					break;
				case "grid.json":
					mbtiles.getGrid(z, x, y, function(err, grid, headers) {
						if (err) {
							res.writeHead(404, {'Content-Type': 'text/plain'});
							res.end('Grid rendering error: ' + err + '\n');
						} else {
							res.writeHead(200, {
								'Content-Type': 'text/json'
//								, 'Cache-Control': 'max-age=' + 60 * 60   // nginx will cache in our case
							});
							res.write(grid);
							res.end();
						}
					});
					break;
				default :
					res.writeHead(404, {'Content-Type': 'text/plain'});
					res.end("404 Not found");
					break;
			}
	}
}).listen(port);