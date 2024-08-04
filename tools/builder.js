const fs = require( "fs" );
const csv = require( "csv-parser" );

// Load the latest card data from the tools folder
console.log( "\r\nLoading files..." );

var rawData = {};
var files = [
	{ key:"abilities", name:"Deckbuilder - Data - Abilities.csv", done:false },
	{ key:"basicItems", name:"Deckbuilder - Data - Basic Items.csv", done:false },
	{ key:"legendaryItems", name:"Deckbuilder - Data - Legendary Items.csv", done:false },
	{ key:"soulShopItems", name:"Deckbuilder - Data - Soul Shop Items.csv", done:false },
	{ key:"vessels", name:"Deckbuilder - Data - Vessel.csv", done:false },
	{ key:"starterDecks", name:"Deckbuilder - Data - Starter Decks.csv", done:false },
	{ key:"craftBases", name:"Deckbuilder - Data - Craft Bases.csv", done:false },
	{ key:"craftOptions", name:"Deckbuilder - Data - Craft Options.csv", done:false }
];
	
// Load and parse each CSV into JSON data
var nextIndex = 0;
load();

function load(){

	var results = [];
	console.log( "loading " + files[nextIndex].name );
	fs.createReadStream( files[nextIndex].name )
	  .pipe( csv() )
	  .on( "data", (data) => results.push(data))
	  .on( "end", () => {
		  
		  rawData[ files[nextIndex].key ] = results;
		  files[nextIndex].done = true;
		  console.log( files[nextIndex].name + " loaded" );
		  
		  nextIndex++;
		  if( nextIndex < files.length )
			  load();
		  else
			  build();
		  
	  });

}

data = {abilities:[],items:[],types:{},starterClasses:[],vessels:[],craftBases:{},craftOptions:[]}
function build(){

	console.log( "\r\nBuilding data..." );

	// Clean and reformat abilities data
	for( var i = 0; i < rawData.abilities.length; i++ ){
		
		var raw = rawData.abilities[i];
		var entry = {};
		
		if( raw.publish != "x" )
			continue;
		
		entry.type = raw.type_01;
		entry.initiative = raw.initiative;
		entry.name = raw.name;
		entry.cooldown = raw.cd_duration;
		entry.id = raw.ID;
		entry.category = "ability";
		
		if( raw.variant == "Alpha Variant" )
			entry.variant = "Alpha";
		else if( raw.variant == "Beta Variant" )
			entry.variant = "Beta";
		else
			entry.variant = "Basic";
		
		entry.effects = [];
		if( raw[ "@effect_01" ] == "/images/ongoing-effect.png" || raw[ "@effect_02" ] == "/images/ongoing-effect.png")
			entry.effects.push( "ongoing" );
		if( raw[ "@effect_01" ] == "/images/interrupt.png" || raw[ "@effect_02" ] == "/images/interrupt.png.png")
			entry.effects.push( "interrupt" );
		
		// TEMP LOGGING
		data.types[ entry.type.toLowerCase() ] = true;
		
		var rules = entry.name + " " + entry.type + " " + raw.major;

		entry.spends = [];
		if( raw[ "@spending_icon_01" ] != "" ){
			var spend = getSpendType( raw[ "@spending_icon_01" ] );
			rules += " " + spend + ": " + raw[ "spending_text_01" ];
			if( spend && !entry.spends.includes( spend ) )
				entry.spends.push( spend.toLowerCase() );
		}		
		if( raw[ "@spending_icon_02" ] != "" ){
			rules += " " + spend + ": " + raw[ "spending_text_02" ];
			var spend = getSpendType( raw[ "@spending_icon_02" ] );
			if( spend && !entry.spends.includes( spend ) )
				entry.spends.push( spend.toLowerCase() );
		}		
		if( raw[ "@spending_icon_03" ] != "" ){
			rules += " " + spend + ": " + raw[ "spending_text_03" ];
			var spend = getSpendType( raw[ "@spending_icon_03" ] );
			if( spend && !entry.spends.includes( spend ) )
				entry.spends.push( spend.toLowerCase() );
		}
		
		rules += " " + raw.minor;
		
		entry.rules = cleanRulesText( rules );
		
		data.abilities.push( entry );
		
	}
	
	// Clean and reformat crafting data
	for( var i = 0; i < rawData.craftBases.length; i++ ){
		var raw = rawData.craftBases[i];
		var entry = {};
		
		entry.name = raw.name;
		entry.id = raw.ID;
		entry.baseEffect = raw.base_effect;
		
		entry.costs = {iron:0,wood:0,silver:0,cloth:0};
		if( raw.cost_iron ) entry.costs.iron = parseInt(raw.cost_iron);
		if( raw.cost_wood ) entry.costs.wood = parseInt(raw.cost_wood);
		if( raw.cost_silver ) entry.costs.silver = parseInt(raw.cost_silver);
		if( raw.cost_cloth ) entry.costs.cloth = parseInt(raw.cost_cloth);
		
		entry.options = {attacks:false,spells:false,defense:false};
		if( raw.options_attacks == "TRUE" ) entry.options.attacks = true;
		if( raw.options_spellcasting == "TRUE" ) entry.options.spells = true;
		if( raw.options_defense == "TRUE" ) entry.options.defense = true;
		
		data.craftBases[entry.name] = entry;
	}
	for( var i = 0; i < rawData.craftOptions.length; i++ ){
		var raw = rawData.craftOptions[i];
		var entry = {};
		
		entry.id = raw.ID;
		entry.type = raw.type;
		entry.spend = raw.spend;
		entry.description = raw.description;
		entry.difficulty = parseInt(raw.difficulty);
		
		entry.costs = {gold:0,iron:0,wood:0,silver:0,cloth:0,steel:0,celestium:0,hardwood:0};
		if( raw.cost_gold ) entry.costs.gold = parseInt(raw.cost_gold);
		if( raw.cost_iron ) entry.costs.iron = parseInt(raw.cost_iron);
		if( raw.cost_wood ) entry.costs.wood = parseInt(raw.cost_wood);
		if( raw.cost_silver ) entry.costs.silver = parseInt(raw.cost_silver);
		if( raw.cost_cloth ) entry.costs.cloth = parseInt(raw.cost_cloth);
		if( raw.cost_steel ) entry.costs.steel = parseInt(raw.cost_steel);
		if( raw.cost_celestium ) entry.costs.celestium = parseInt(raw.cost_celestium);
		if( raw.cost_hardwood ) entry.costs.hardwood = parseInt(raw.cost_hardwood);
		
		entry.compatibleItems = raw.compatible_items.split(",");
		
		data.craftOptions.push(entry);
	}
	
	// Combine the different types of items for processing
	var combinedItems = rawData.basicItems;
	for( var i = 0; i < rawData.legendaryItems.length; i++ )
		combinedItems.push( rawData.legendaryItems[i] );
	for( var i = 0; i < rawData.soulShopItems.length; i++ )
		combinedItems.push( rawData.soulShopItems[i] );
	
	// Clean, reformat, and combine item data
	for( var i = 0; i < combinedItems.length; i++ ){
		
		var raw = combinedItems[i];
		var entry = {};
		
		if( raw.publish != "x" )
			continue;
		
		entry.name = raw.name;
		entry.abundance = raw.abundance;
		entry.durability = raw.durability;
		entry.price = raw.price;
		entry.tier = raw.adventure_tier;
		entry.id = raw.ID;
		entry.category = "item";
		
		if( raw[ "@cost-icon" ] == "/images/cost-gold-icon.png" )
			entry.currency = "Gold";
		if( raw[ "@cost-icon" ] == "/images/cost-soulshard-icon.png" )
			entry.currency = "SoulShards";

		entry.types = [];
		if( raw.type_1 ){
			var chunks = raw.type_1.split( " " );
			for( var c = 0; c < chunks.length; c++ ){
				entry.types.push( chunks[c].toLowerCase().replace( ",", "" ) );
				data.types[ chunks[c].toLowerCase().replace( ",", "" ) ] = true;
			}
		}
		if( raw.type_2 ){
			var chunks = raw.type_2.split( " " );
			for( var c = 0; c < chunks.length; c++ ){
				entry.types.push( chunks[c].toLowerCase().replace( ",", "" ) );
				data.types[ chunks[c].toLowerCase().replace( ",", "" ) ] = true;
			}
		}
		if( raw.type_3 ){
			var chunks = raw.type_3.split( " " );
			for( var c = 0; c < chunks.length; c++ ){
				entry.types.push( chunks[c].toLowerCase().replace( ",", "" ) );
				data.types[ chunks[c].toLowerCase().replace( ",", "" ) ] = true;
			}
		}
		
		// Add hidden extra type for handheld items
		if( ( entry.types.includes( "weapon" ) || entry.types.includes( "shield" ) ) && !entry.types.includes( "rune" ) ){
			entry.types.push( "hand" );
		}
		
		var rules = entry.name + " ";
		for( var x = 0; x < entry.types.length; x++ )
			rules += entry.types[x] + " ";
		
		rules += raw.Effect;

		entry.spends = [];
		if( raw[ "@spending_icon_01" ] != "" ){
			var spend = getSpendType( raw[ "@spending_icon_01" ] );
			rules += " " + spend + ": " + raw[ "spending_text_01" ];
			if( spend && !entry.spends.includes( spend ) )
				entry.spends.push( spend.toLowerCase() );
		}		
		if( raw[ "@spending_icon_02" ] != "" ){
			rules += " " + spend + ": " + raw[ "spending_text_02" ];
			var spend = getSpendType( raw[ "@spending_icon_02" ] );
			if( spend && !entry.spends.includes( spend ) )
				entry.spends.push( spend.toLowerCase() );
		}		
		if( raw[ "@spending_icon_03" ] != "" ){
			rules += " " + spend + ": " + raw[ "spending_text_03" ];
			var spend = getSpendType( raw[ "@spending_icon_03" ] );
			if( spend && !entry.spends.includes( spend ) )
				entry.spends.push( spend.toLowerCase() );
		}	
		
		entry.craftable = false;
		if( data.craftBases[ entry.name ] ){
			entry.craftable = true;
			rules += " craftable";
			entry.craftBaseId = data.craftBases[ entry.name ].id;
		}

		entry.rules = cleanRulesText( rules );
		
		data.items.push( entry );	
		
	}
	
	// Clean and reformat starter deck data
	var classMap = {};
	for( var i = 0; i < rawData.starterDecks.length; i++ ){
		var raw = rawData.starterDecks[i];
		
		if( !classMap[ raw[ "starter-deck" ] ] )
			classMap[ raw[ "starter-deck" ] ] = [];
		
		classMap[ raw[ "starter-deck" ] ].push( raw[ "card-id" ] );
	}
	for( var [key, value] of Object.entries( classMap ) ) {
		data.starterClasses.push( { name:key, abilities:value } );
	}
	
	// Clean and refromat vessel data
	for( var i = 0; i < rawData.vessels.length; i++ ){

		var raw = rawData.vessels[i];
		var entry = {};

		if( raw.publish != "x" )
			continue;
		
		entry.name = raw.name;
		entry.speed = raw.speed;
		entry.category = "vessel";
		
		entry.wounds = [ parseInt( raw.wt1), parseInt( raw.wt2 ), parseInt( raw.wt3 ) ];
		entry.scratches = parseInt( raw.wt1 ) + parseInt( raw.wt2 ) + parseInt( raw.wt3 );

		entry.id = raw[ "@portrait" ].replace( "/images/", "" ).replace( ".png", "" );
		
		entry.rules = raw.name + " " + raw.surgeSpend;
		entry.rules += " " + raw.defaultPerkTitle + " " + raw.defaultPerk;
		entry.rules += " " + raw.perk1ATitle + " " + raw.perk1A;
		entry.rules += " " + raw.perk1BTitle + " " + raw.perk1B;
		entry.rules += " " + raw.perk2ATitle + " " + raw.perk2A;
		entry.rules += " " + raw.perk2BTitle + " " + raw.perk2B;
		entry.rules = cleanRulesText( entry.rules );
		
		switch( raw[ "@background-image" ] ){
			case "/images/common-bg.png":
				entry.rarity = "common";
				break;
			case "/images/legendary-bg.png":
				entry.rarity = "legendary";
				break;
			case "/images/rare-bg.png":
				entry.rarity = "rare";
				break;
			case "/images/mythical-bg.png":
				entry.rarity = "mythical";
				break;
		}
		
		data.vessels.push( entry );
		
	}
	
	// Sort the entries alphabetically by name
	data.abilities.sort( function( a,b ){

		var aVal = "";
		switch( a.variant ){
			case "Basic":
				aVal = a.name + "0";
				break;
			case "Alpha":
				aVal = a.name + "1";
				break;
			case "Beta":
				aVal = a.name + "2";
				break;
		}
		
		var bVal = "";
		switch( b.variant ){
			case "Basic":
				bVal = b.name + "0";
				break;
			case "Alpha":
				bVal = b.name + "1";
				break;
			case "Beta":
				bVal = b.name + "2";
				break;
		}
		
		if( aVal > bVal ) return 1;
		else return -1;
		
	} );
	
	data.items.sort( function( a,b ){
		
		if( a.name > b.name ) return 1;
		else return -1;
		
	} );
	
	data.starterClasses.sort( function( a,b ){
		
		if( a.name > b.name ) return 1;
		else return -1;
		
	} );
	
	data.vessels.sort( function( a,b ){
		
		if( a.name > b.name ) return 1;
		else return -1;
		
	} );

	finishBuild( data );
	
}

function getSpendType( rawValue ){
	
	if( rawValue == "/images/doubleplus-icon.png" )
		return "DoubleSurge";
	
	if( rawValue == "/images/plus-icon.png" )
		return "Surge";
	
	if( rawValue == "/images/star-icon.png" )
		return "Star";
	
	if( rawValue == "/images/numbers12-icon.png" )
		return "Numbers";
	
	return null;	
	
}

function cleanRulesText( rulesText ){
	
	rulesText = rulesText.replace( /##Ongoing\(end_on\)/g, "Ongoing" );
	rulesText = rulesText.replace( /##Interrupt\(end_int\)/g, "Interrupt" );
	rulesText = rulesText.replace( /##Spellcasting\(([\d]+)\+\)/g, "Spellcasting $1+");
	rulesText = rulesText.replace( /\(##red\)/g, "" );
	rulesText = rulesText.replace( /\(Plus\)/g, "(Surge)" );
	rulesText = rulesText.replace( /\(PlusPlus\)/g, "(Double Surge)" );
	
	/*
		(Enhancement Die)
		(Standard Die)
		(Cursed Die)
		(Power Die)
		(Blessing Die)
		(Plus)
		(PlusPlus)
		(Star)
	*/
	
	return rulesText;
	
}


// Performs final cleanup and saves out the data files
function finishBuild( data ){
		
	// Save the compact version of the file
	fs.writeFile( "data.json", JSON.stringify( data ), function( err ){
		if( err ) return console.log( err );
		console.log("Minified data.json saved.");
	} ); 
	
	// Save the human readable version of the file
	fs.writeFile( "data-expanded.json", JSON.stringify( data, null, "\t" ), function( err ){
		if( err ) return console.log( err );
		console.log("Readable data-expanded.json saved.");
	} );

}


// Capitalizes the first letter of each word in a string
function capitalize( string ){
	return string.replace( /\b\w+/g, function( text ){
		return text.charAt( 0 ).toUpperCase() + text.substr( 1 ).toLowerCase();
	} );
}

// Formats time in milliseconds into HH:MM:SS format
function formatTime( msTime ){
	
	var sTime = msTime / 1000;
	var hours = Math.floor( sTime / ( 60 * 60 ) );
	var minutes = Math.floor( ( sTime % ( 60 * 60 ) ) / 60 );
	var seconds = Math.floor( sTime % 60 );
	return hours + ":" + padDigits( minutes, 2 ) + ":" + padDigits( seconds, 2 );
	
}

// Zero-pads a numeric string to the specific number of digits
function padDigits( number, digits ){

	number = number + "";
	while( number.length < digits )
		number = "0" + number;
	return number;
	
}