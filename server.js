var express = require("express"),
		app = express(),
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

app.get('/:z/:x/:y.*', function getTile(req, res) {
	if (!mbtiles) { // not ready yet, try with small delay
		return setTimeout( function(){
			getTile(req, res);
		}, 10);
	}
	var extension = req.param(0);
	switch (extension) {
		case "png": {
			mbtiles.getTile(req.param('z'), req.param('x'), req.param('y'), function(err, tile, headers) {
				if (err) {
					res.status(404).send('Tile rendering error: ' + err + '\n');
				} else {
					res.header("Content-Type", "image/png")
					res.send(tile);
				}
			});
			break;
		}
		case "grid.json": {
			mbtiles.getGrid(req.param('z'), req.param('x'), req.param('y'), function(err, grid, headers) {
				if (err) {
					res.status(404).send('Grid rendering error: ' + err + '\n');
				} else {
					res.header("Content-Type", "text/json");
					res.header('Cache-Control', 'max-age=' + 60 * 60);
					res.send(grid);
				}
			});
			break;
		}
	}
});

// actually create the server
app.listen(port);
