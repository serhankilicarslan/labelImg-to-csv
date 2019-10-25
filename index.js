const inquirer = require('inquirer'),
fs = require('fs'),
path = require('path'),
xml2js = require('xml2js'),
cTable = require('console.table'),
parser = new xml2js.Parser()

var gsPath, dataFolder;
var rows = new Object();
var table = new Array();

var questions = [
	{ type: 'input', name: 'projectId', message: "What's your projectId? (gs://projectId.appspot.com)", default: 'projectId'},
	{ type: 'input', name: 'dataFolder', message: "What's your data folder? (data/???)", default: 'example'},
]

inquirer.prompt(questions).then(answers => {
	gsPath = `gs://${answers['projectId']}.appspot.com` 
	dataFolder = 'data\/' + answers['dataFolder']
	run();
})

async function run() {
	try {
		var csv = `[set,]image_path[,label,x1,y1,,,x2,y2]`;
		var files = fs.readdirSync(path.join(__dirname, `./${dataFolder}`));
		for (var i = 0;  i < files.length; i++) {
			if (files[i].indexOf('.xml') > 0) {
				// console.log(files[i])
				var xml = fs.readFileSync(path.join(__dirname, `./${dataFolder}/${files[i]}`));
				if (xml.length > 0) {
					var lines = await createCSVLines(xml)
					csv = csv + lines;
				}
			}
		}
		fs.writeFileSync(`./${dataFolder}/labelImg.csv`, csv);
		writeTable()
		console.log(`CSV file: "./${dataFolder}/labelImg.csv"`)
	} catch (ex) {
		console.log('ex', ex)
	}
}

function writeTable() {
	table = []
	Object.keys(rows).forEach(function (key) {
		table.push({
			label: key,
			count: rows[key].count,
			train: rows[key].train,
			validate: rows[key].validate,
			test: rows[key].test
		})
	})
	console.table(table);
}

function createCSVLines(xml) {
	  return new Promise(resolve => {
		var obj = parser.parseString(xml, function (err, obj) {
			var lines = addCsvLine(obj)	
			resolve(lines);
		});
	  });
	}

function addCsvLine(xml) {
	var result = ``;
	var folder = xml.annotation.folder[0]
	var filename = xml.annotation.filename[0]
	var width = xml.annotation.size[0].width[0]
	var height = xml.annotation.size[0].height[0]
	if (xml.annotation.object != null)
		for (var i = 0;  i < xml.annotation.object.length; i++) {
			var obj = xml.annotation.object[i];
			var name = obj.name[0].toString()
			var xmin = obj.bndbox[0].xmin[0]
			var ymin = obj.bndbox[0].ymin[0]
			var xmax = obj.bndbox[0].xmax[0]
			var ymax = obj.bndbox[0].ymax[0]
			
			var x1 = (xmin / width).toFixed(2)
			var y1 = (ymin / height).toFixed(2)
			var x2 = (xmax / width).toFixed(2)
			var y2 = (ymax / height).toFixed(2)

			if (rows[name] == undefined) { rows[name] = { count:0, train: 0, validate:0, test:0 } }
			var type; // TRAIN, VALIDATION, TEST
			if (rows[name].count != 0 && rows[name].count % 8 == 0) {
				rows[name].validate++
				type = 'VALIDATION'
			}
			else if (rows[name].count != 0 && rows[name].count % 9 == 0) {
				rows[name].test++
				type = 'TEST'
			}
			else {
				rows[name].train++
				type = 'TRAIN'
			}
			rows[name].count++
			result += `\r\n${type},${gsPath}/${folder}/${filename},${name},${x1},${y1},,,${x2},${y2},,`;
		}
	return result;
}