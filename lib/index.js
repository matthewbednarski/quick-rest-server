var endpoint = require('./endpoint');
var yargs = require('yargs')
    .alias('?', 'help')
    .alias('e', 'endpoint')
    .describe( 'e', 'part of the url coming after the host:port')
    .alias('k', 'key_field')
    .describe('k', 'Property on objects to use as their key field')
    .alias('p', 'port')
    .describe('p', 'listen port')
    .alias('f', 'db_file')
    .describe('f', 'File for persisting objects')
    .usage('Usage: $0 -e [endpoint-name] -k [objects-key-field] -p [port] -f [persistence-file]')
    .default({
		help: false,
        e: "item",
        k: "key",
        f: ".restifydb",
        p: 8002
    });
var argv = yargs.argv;
if(argv.help){
	yargs.showHelp();
	return;
}
endpoint.setup(argv.endpoint, argv.key_field, argv.db_file);
endpoint.start(argv.port);
