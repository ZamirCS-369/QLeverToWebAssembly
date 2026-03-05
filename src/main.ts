import './style.css'
import { renderQleverResult } from './render'
console.log("Hello world")

const input = document.getElementById('userInput') as HTMLInputElement;
//const loadbutton = document.getElementById('loadButton') as HTMLButtonElement;
const querybutton = document.getElementById('runQuery') as HTMLButtonElement;
const queryOptions = document.getElementById('queryOptions') as HTMLButtonElement;

// Keep track of dropdown menu
const dropdown = document.getElementById("datasetSelect") as HTMLSelectElement;
let selectedDataset: string = ""; //dropdown.value;
let selectedQuery: string = "";
let MyModule: any;

let wasmReady = false;

// Initialize wasm module
async function initWasm() {
    const MyModuleFactory = (window as any).MyModule;
    MyModule = await MyModuleFactory({
        locateFile: (path: string) => {
            console.log("WASM requested:", path);
            if (path.endsWith('11.wasm')) {
                return '/QLeverToWebAssembly/multithreadoutput11.wasm'; // served from public/
            }
            return "/QLeverToWebAssembly/" + path;
        }
    });
    wasmReady = true;
    console.log("WASM loaded");
}

initWasm();

// Update the selected index and load it into the virtual filesystem
dropdown.addEventListener("change", function() {
    console.log("Selected dataset:", dropdown.value);
    selectedDataset = dropdown.value;
    if (!wasmReady) {
        alert("WASM still loading...");
        return;
    }

    if (selectedDataset == 'House') {
        console.log('trying to fetch house');
        fetch_house_index();
        console.log('fetching complete');
    }
    else if (selectedDataset == 'Olympics') {
        console.log('trying to fetch olympics');
        fetch_olympics_index();
        console.log('fetching complete!');
    }
    else if (selectedDataset == 'IRI-resolution') {
        console.log('trying to fetch IRI-resolution');
        fetch_IRIresolution_index();
        console.log('fetching complete!');
    }
    else if (selectedDataset == 'TBBT') {
        console.log('trying to fetch TBBT');
        fetch_tbbt_index();
        console.log('fetching complete!');
    } else {
        alert("Please select a prebuilt index!");
        return;
    } 
    console.log("Selected dataset:", selectedDataset);
});

querybutton.addEventListener('click', () => {
    run_query();
})

// catch a manually entered query and run it
input.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        selectedQuery = input.value;
        console.log('User input', selectedQuery);
    }
    run_query();
});

// Some preset queries
const query1 = `PREFIX schema: <http://schema.org/>
SELECT * {
  ?person a schema:Person
}`;

const query2 = `PREFIX schema: <http://schema.org/>
SELECT ?person ?givenName ?familyName ?jobTitle
WHERE {
    ?person a schema:Person ;
              schema:givenName ?givenName ;
              schema:familyName ?familyName ;
              schema:jobTitle ?jobTitle
}`;

const query3 = `PREFIX schema: <http://schema.org/>
SELECT ?person ?givenName ?familyName
WHERE {
    ?person schema:knows <https://housemd.rdf-ext.org/person/gregory-house> ;
            schema:givenName ?givenName ;
            schema:familyName ?familyName .
}`;

const query4 = `PREFIX ex: <urn:ex:>
SELECT ?s ?o
WHERE {
    ?s ex:p ?o .
    FILTER(STRENDS(STR(?o), <http://a/bb/ccc/g>))
}`;

const query5 = `PREFIX ex: <urn:ex:>
SELECT ?s ?o
WHERE {
    ?s ex:p ?o .
    FILTER(CONTAINS(STR(?o), '?'))
}`;

const query6 = `PREFIX ex: <urn:ex:>
SELECT ?s ?o
WHERE {
    ?s ex:p ?o .
    FILTER(CONTAINS(STR(?o), '#'))
}`;

const query7 = `PREFIX schema: <http://schema.org/>
PREFIX ex: <http://example.org/>

SELECT ?character ?givenName ?familyName
WHERE {
    ?character a schema:Person ;
                 schema:givenName ?givenName ;
                 schema:familyName ?familyName .
}`;

const query8 = `PREFIX schema: <http://schema.org/>
PREFIX person: <http://localhost:8080/data/person/>      

SELECT ?character ?givenName
WHERE {
    ?character schema:knows person:sheldon-cooper ;
               schema:givenName ?givenName .
}`;

const query9 = `PREFIX schema: <http://schema.org/>
PREFIX ex: <http://example.org/>

SELECT ?person1 ?givenName1 ?familyName1 ?person2 ?givenName2 ?familyName2
WHERE {
    ?person1 schema:knows ?person2 ;
             schema:givenName ?givenName1 ;
             schema:familyName ?familyName1 .
    ?person2 schema:knows ?person1 ;
             schema:givenName ?givenName2 ;
             schema:familyName ?familyName2 .
    FILTER(?person1 < ?person2)  # Avoid duplicate pairs (A-B and B-A)
}`;

function run_query() {
    const config = new MyModule["IndexBuilderConfig"]();
    const vec = new MyModule["InputFileSpecificationVector"]();
    const fileSpec = new MyModule["InputFileSpecification"]();
    if (selectedDataset == "House") {
        fileSpec.filename = "housemd.nq";
        fileSpec.filetype = MyModule.Filetype.NQuad;
        config.baseName = "HouseIndex";
    } else if (selectedDataset == "Olympics") {
        fileSpec.filename = "olympics.nt";
        fileSpec.filetype = MyModule.Filetype.Turtle;
        config.baseName = "Olympics";
    } else if (selectedDataset == "IRI-resolution") {
        fileSpec.filename = "IRI-resolution.nt";
        fileSpec.filetype = MyModule.Filetype.Turtle;
        config.baseName = "IRI-resolution";
    } else if (selectedDataset == "TBBT") {
        fileSpec.filename = "tbbt.nt";
        fileSpec.filetype = MyModule.Filetype.Turtle;
        config.baseName = "TBBT";
    } else {
        alert("No dataset selected!"); 
        return;
    }
    vec.push_back(fileSpec);
    config.inputFiles = vec;
    

    var engineConfig;
    var qlever;
    //var basicQuery = 'PREFIX schema: <http://schema.org/> SELECT *{ ?person a schema:Person}';
    var basicQuery = selectedQuery;
    var queryResult;
    console.log('configuring engine');
    try {
        // create engine config with existing config
        engineConfig = new MyModule.EngineConfig(config);
        console.log('engine configured');
    }
    catch(e) {
        console.error(e);
    }
    console.log('configuring qlever with engine');
    try {
        qlever = new MyModule.Qlever(engineConfig);
        console.log('qlever with engine configured');
    }
    catch(e) {
        console.log('problem configuring qlever with engine');
        console.error(e);
    }
    console.log('run the query');
    try {
        queryResult = qlever.query(basicQuery, MyModule.MediaType.qleverJson);
        console.log('query successfull');
        console.log(queryResult);
        renderQleverResult(queryResult);
    }
    catch(e) {
        console.error(e);
        console.log('problem with running query');
    }
    finally {
        console.log('deleting objects');
        // delete the objects at the end
        qlever.delete();
        engineConfig.delete();
        config.delete();
        vec.delete();
        fileSpec.delete();
    }
}

// Capture query input (live typing)
queryOptions.addEventListener("change", function() {
    if (queryOptions.value == "1") {
        input.value = query1;
    } else if (queryOptions.value == "2") {
        input.value = query2;
    } else if (queryOptions.value == "3") {
        input.value = query3;
    } else if (queryOptions.value == "4") {
        input.value = query4;
    } else if (queryOptions.value == "5") {
        input.value = query5;
    } else if (queryOptions.value == "6") {
        input.value = query6;
    } else if (queryOptions.value == "7") {
        input.value = query7;
    } else if (queryOptions.value == "8") {
        input.value = query8;
    } else if (queryOptions.value == "9") {
        input.value = query9;
    }
    console.log("Current query:", input.value);
    selectedQuery = input.value;
});

// functions that fetch all the files from prebuilt indexes

async function fetch_house_index() {
    // 🔹 Fetch RDF file from public/
    const response0 = await fetch("/housemd.nq");
    const buffer0 = await response0.arrayBuffer();
    if (!response0.ok) {
        throw new Error("Failed to fetch housemd.nq");
    }
    // 🔹 Write housemd dataset into Emscripten virtual FS
    MyModule.FS.writeFile(
        "housemd.nq",
        new Uint8Array(buffer0)
    );

    const response = await fetch("/HouseIndex.index.ops");
    const buffer = await response.arrayBuffer();
    if (!response.ok) {
        throw new Error("Failed to fetch HouseIndex.index.ops");
    }

    MyModule.FS.writeFile(
        "HouseIndex.index.ops",
        new Uint8Array(buffer)
    );

    const response2 = await fetch("/HouseIndex.index.ops.meta");
    const buffer2 = await response2.arrayBuffer();
    if (!response2.ok) {
        throw new Error("Failed to fetch HouseIndex.index.ops.meta");
    }

    MyModule.FS.writeFile(
        "HouseIndex.index.ops.meta",
        new Uint8Array(buffer2)
    );

    const response3 = await fetch("/HouseIndex.index.osp");
    const buffer3 = await response3.arrayBuffer();
    if (!response3.ok) {
        throw new Error("Failed to fetch HouseIndex.index.osp");
    }

    MyModule.FS.writeFile(
        "HouseIndex.index.osp",
        new Uint8Array(buffer3)
    );

    const response4 = await fetch("/HouseIndex.index.osp.meta");
    const buffer4 = await response4.arrayBuffer();
    if (!response4.ok) {
        throw new Error("Failed to fetch HouseIndex.index.osp.meta");
    }

    MyModule.FS.writeFile(
        "HouseIndex.index.osp.meta",
        new Uint8Array(buffer4)
    );

    const response5 = await fetch("/HouseIndex.index.patterns");
    const buffer5 = await response5.arrayBuffer();
    if (!response5.ok) {
        throw new Error("Failed to fetch HouseIndex.index.patterns");
    }

    MyModule.FS.writeFile(
        "HouseIndex.index.patterns",
        new Uint8Array(buffer5)
    );

    const response6 = await fetch("/HouseIndex.index.pos");
    const buffer6 = await response6.arrayBuffer();
    if (!response6.ok) {
        throw new Error("Failed to fetch HouseIndex.index.pos");
    }

    MyModule.FS.writeFile(
        "HouseIndex.index.pos",
        new Uint8Array(buffer6)
    );

    const response7 = await fetch("/HouseIndex.index.pos.meta");
    const buffer7 = await response7.arrayBuffer();
    if (!response7.ok) {
        throw new Error("Failed to fetch HouseIndex.index.pos.meta");
    }

    MyModule.FS.writeFile(
        "HouseIndex.index.pos.meta",
        new Uint8Array(buffer7)
    );

    const response8 = await fetch("/HouseIndex.index.pso");
    const buffer8 = await response8.arrayBuffer();
    if (!response8.ok) {
        throw new Error("Failed to fetch HouseIndex.index.pso");
    }

    MyModule.FS.writeFile(
        "HouseIndex.index.pso",
        new Uint8Array(buffer8)
    );

    const response9 = await fetch("/HouseIndex.index.pso.meta");
    const buffer9 = await response9.arrayBuffer();
    if (!response9.ok) {
        throw new Error("Failed to fetch HouseIndex.index.pso.meta");
    }

    MyModule.FS.writeFile(
        "HouseIndex.index.pso.meta",
        new Uint8Array(buffer9)
    );

    const response10 = await fetch("/HouseIndex.index.sop");
    const buffer10 = await response10.arrayBuffer();
    if (!response10.ok) {
        throw new Error("Failed to fetch HouseIndex.index.sop");
    }

    MyModule.FS.writeFile(
        "HouseIndex.index.sop",
        new Uint8Array(buffer10)
    );

    const response11 = await fetch("/HouseIndex.index.sop.meta");
    const buffer11 = await response11.arrayBuffer();
    if (!response11.ok) {
        throw new Error("Failed to fetch HouseIndex.index.sop.meta");
    }

    MyModule.FS.writeFile(
        "HouseIndex.index.sop.meta",
        new Uint8Array(buffer11)
    );

    const response12 = await fetch("/HouseIndex.index.spo");
    const buffer12 = await response12.arrayBuffer();
    if (!response12.ok) {
        throw new Error("Failed to fetch HouseIndex.index.spo");
    }

    MyModule.FS.writeFile(
        "HouseIndex.index.spo",
        new Uint8Array(buffer12)
    );

    const response13 = await fetch("/HouseIndex.index.spo.meta");
    const buffer13 = await response13.arrayBuffer();
    if (!response13.ok) {
        throw new Error("Failed to fetch HouseIndex.index.spo.meta");
    }

    MyModule.FS.writeFile(
        "HouseIndex.index.spo.meta",
        new Uint8Array(buffer13)
    );

    const response14 = await fetch("/HouseIndex.internal.index.pos");
    const buffer14 = await response14.arrayBuffer();
    if (!response14.ok) {
        throw new Error("Failed to fetch HouseIndex.internal.index.pos");
    }

    MyModule.FS.writeFile(
        "HouseIndex.internal.index.pos",
        new Uint8Array(buffer14)
    );

    const response15 = await fetch("/HouseIndex.internal.index.pos.meta");
    const buffer15 = await response15.arrayBuffer();
    if (!response15.ok) {
        throw new Error("Failed to fetch HouseIndex.internal.index.pos.meta");
    }

    MyModule.FS.writeFile(
        "HouseIndex.internal.index.pos.meta",
        new Uint8Array(buffer15)
    );

    const response16 = await fetch("/HouseIndex.internal.index.pso");
    const buffer16 = await response16.arrayBuffer();
    if (!response16.ok) {
        throw new Error("Failed to fetch HouseIndex.internal.index.pso");
    }

    MyModule.FS.writeFile(
        "HouseIndex.internal.index.pso",
        new Uint8Array(buffer16)
    );

    const response17 = await fetch("/HouseIndex.internal.index.pso.meta");
    const buffer17 = await response17.arrayBuffer();
    if (!response17.ok) {
        throw new Error("Failed to fetch HouseIndex.internal.index.pso.meta");
    }

    MyModule.FS.writeFile(
        "HouseIndex.internal.index.pso.meta",
        new Uint8Array(buffer17)
    );

    const response18 = await fetch("/HouseIndex.meta-data.json");
    const buffer18 = await response18.arrayBuffer();
    if (!response18.ok) {
        throw new Error("Failed to fetch HouseIndex.meta-data.json");
    }
    else {
        console.log("HouseIndex.meta-data.json loaded")
    }

    // 🔹 Write HouseIndex. dataset into Emscripten virtual FS
    MyModule.FS.writeFile(
        "HouseIndex.meta-data.json",
        new Uint8Array(buffer18)
    );

    const response19 = await fetch("/HouseIndex.vocabulary.codebooks");
    const buffer19 = await response19.arrayBuffer();
    if (!response19.ok) {
        throw new Error("Failed to fetch HouseIndex.vocabulary.codebooks");
    }

    MyModule.FS.writeFile(
        "HouseIndex.vocabulary.codebooks",
        new Uint8Array(buffer19)
    );

    const response20 = await fetch("/HouseIndex.vocabulary.words.external");
    const buffer20 = await response20.arrayBuffer();
    if (!response20.ok) {
        throw new Error("Failed to fetch HouseIndex.vocabulary.words.external");
    }

    MyModule.FS.writeFile(
        "HouseIndex.vocabulary.words.external",
        new Uint8Array(buffer20)
    );

    const response21 = await fetch("/HouseIndex.vocabulary.words.external.offsets");
    const buffer21 = await response21.arrayBuffer();
    if (!response21.ok) {
        throw new Error("Failed to fetch HouseIndex.vocabulary.words.external.offsets");
    }

    // 🔹 Write HouseIndex.vocabulary.words.internal dataset into Emscripten virtual FS
    MyModule.FS.writeFile(
        "HouseIndex.vocabulary.words.external.offsets",
        new Uint8Array(buffer21)
    );

    const response22 = await fetch("/HouseIndex.vocabulary.words.internal");
    const buffer22 = await response22.arrayBuffer();
    if (!response22.ok) {
        throw new Error("Failed to fetch HouseIndex.vocabulary.words.internal");
    }

    MyModule.FS.writeFile(
        "HouseIndex.vocabulary.words.internal",
        new Uint8Array(buffer22)
    );

    const response23 = await fetch("/HouseIndex.vocabulary.words.internal.ids");
    const buffer23 = await response23.arrayBuffer();
    if (!response23.ok) {
        throw new Error("Failed to fetch HouseIndex.vocabulary.words.internal.ids");
    }

    // 🔹 Write HouseIndex.vocabulary.words.internal.ids dataset into Emscripten virtual FS
    MyModule.FS.writeFile(
        "HouseIndex.vocabulary.words.internal.ids",
        new Uint8Array(buffer23)
    );
}

async function fetch_IRIresolution_index() {
    // 🔹 Fetch RDF file from public/
    const response0 = await fetch("/IRI-resolution.nt");
    const buffer0 = await response0.arrayBuffer();
    if (!response0.ok) {
        throw new Error("Failed to fetch IRI-resolution.nt");
    }
    // 🔹 Write IRI-resolution dataset into Emscripten virtual FS
    MyModule.FS.writeFile(
        "IRI-resolution.nt",
        new Uint8Array(buffer0)
    );

    const response = await fetch("/IRI-resolution.index.ops");
    const buffer = await response.arrayBuffer();
    if (!response.ok) {
        throw new Error("Failed to fetch IRI-resolution.index.ops");
    }

    MyModule.FS.writeFile(
        "IRI-resolution.index.ops",
        new Uint8Array(buffer)
    );

    const response2 = await fetch("/IRI-resolution.index.ops.meta");
    const buffer2 = await response2.arrayBuffer();
    if (!response2.ok) {
        throw new Error("Failed to fetch IRI-resolution.index.ops.meta");
    }

    MyModule.FS.writeFile(
        "IRI-resolution.index.ops.meta",
        new Uint8Array(buffer2)
    );

    const response3 = await fetch("/IRI-resolution.index.osp");
    const buffer3 = await response3.arrayBuffer();
    if (!response3.ok) {
        throw new Error("Failed to fetch IRI-resolution.index.osp");
    }

    MyModule.FS.writeFile(
        "IRI-resolution.index.osp",
        new Uint8Array(buffer3)
    );

    const response4 = await fetch("/IRI-resolution.index.osp.meta");
    const buffer4 = await response4.arrayBuffer();
    if (!response4.ok) {
        throw new Error("Failed to fetch IRI-resolution.index.osp.meta");
    }

    MyModule.FS.writeFile(
        "IRI-resolution.index.osp.meta",
        new Uint8Array(buffer4)
    );

    const response5 = await fetch("/IRI-resolution.index.patterns");
    const buffer5 = await response5.arrayBuffer();
    if (!response5.ok) {
        throw new Error("Failed to fetch IRI-resolution.index.patterns");
    }

    MyModule.FS.writeFile(
        "IRI-resolution.index.patterns",
        new Uint8Array(buffer5)
    );

    const response6 = await fetch("/IRI-resolution.index.pos");
    const buffer6 = await response6.arrayBuffer();
    if (!response6.ok) {
        throw new Error("Failed to fetch IRI-resolution.index.pos");
    }

    MyModule.FS.writeFile(
        "IRI-resolution.index.pos",
        new Uint8Array(buffer6)
    );

    const response7 = await fetch("/IRI-resolution.index.pos.meta");
    const buffer7 = await response7.arrayBuffer();
    if (!response7.ok) {
        throw new Error("Failed to fetch IRI-resolution.index.pos.meta");
    }

    MyModule.FS.writeFile(
        "IRI-resolution.index.pos.meta",
        new Uint8Array(buffer7)
    );

    const response8 = await fetch("/IRI-resolution.index.pso");
    const buffer8 = await response8.arrayBuffer();
    if (!response8.ok) {
        throw new Error("Failed to fetch IRI-resolution.index.pso");
    }

    MyModule.FS.writeFile(
        "IRI-resolution.index.pso",
        new Uint8Array(buffer8)
    );

    const response9 = await fetch("/IRI-resolution.index.pso.meta");
    const buffer9 = await response9.arrayBuffer();
    if (!response9.ok) {
        throw new Error("Failed to fetch IRI-resolution.index.pso.meta");
    }

    MyModule.FS.writeFile(
        "IRI-resolution.index.pso.meta",
        new Uint8Array(buffer9)
    );

    const response10 = await fetch("/IRI-resolution.index.sop");
    const buffer10 = await response10.arrayBuffer();
    if (!response10.ok) {
        throw new Error("Failed to fetch IRI-resolution.index.sop");
    }

    MyModule.FS.writeFile(
        "IRI-resolution.index.sop",
        new Uint8Array(buffer10)
    );

    const response11 = await fetch("/IRI-resolution.index.sop.meta");
    const buffer11 = await response11.arrayBuffer();
    if (!response11.ok) {
        throw new Error("Failed to fetch IRI-resolution.index.sop.meta");
    }

    MyModule.FS.writeFile(
        "IRI-resolution.index.sop.meta",
        new Uint8Array(buffer11)
    );

    const response12 = await fetch("/IRI-resolution.index.spo");
    const buffer12 = await response12.arrayBuffer();
    if (!response12.ok) {
        throw new Error("Failed to fetch IRI-resolution.index.spo");
    }

    MyModule.FS.writeFile(
        "IRI-resolution.index.spo",
        new Uint8Array(buffer12)
    );

    const response13 = await fetch("/IRI-resolution.index.spo.meta");
    const buffer13 = await response13.arrayBuffer();
    if (!response13.ok) {
        throw new Error("Failed to fetch IRI-resolution.index.spo.meta");
    }

    MyModule.FS.writeFile(
        "IRI-resolution.index.spo.meta",
        new Uint8Array(buffer13)
    );

    const response14 = await fetch("/IRI-resolution.internal.index.pos");
    const buffer14 = await response14.arrayBuffer();
    if (!response14.ok) {
        throw new Error("Failed to fetch IRI-resolution.internal.index.pos");
    }

    MyModule.FS.writeFile(
        "IRI-resolution.internal.index.pos",
        new Uint8Array(buffer14)
    );

    const response15 = await fetch("/IRI-resolution.internal.index.pos.meta");
    const buffer15 = await response15.arrayBuffer();
    if (!response15.ok) {
        throw new Error("Failed to fetch IRI-resolution.internal.index.pos.meta");
    }

    MyModule.FS.writeFile(
        "IRI-resolution.internal.index.pos.meta",
        new Uint8Array(buffer15)
    );

    const response16 = await fetch("/IRI-resolution.internal.index.pso");
    const buffer16 = await response16.arrayBuffer();
    if (!response16.ok) {
        throw new Error("Failed to fetch IRI-resolution.internal.index.pso");
    }

    MyModule.FS.writeFile(
        "IRI-resolution.internal.index.pso",
        new Uint8Array(buffer16)
    );

    const response17 = await fetch("/IRI-resolution.internal.index.pso.meta");
    const buffer17 = await response17.arrayBuffer();
    if (!response17.ok) {
        throw new Error("Failed to fetch IRI-resolution.internal.index.pso.meta");
    }

    MyModule.FS.writeFile(
        "IRI-resolution.internal.index.pso.meta",
        new Uint8Array(buffer17)
    );

    const response18 = await fetch("/IRI-resolution.meta-data.json");
    const buffer18 = await response18.arrayBuffer();
    if (!response18.ok) {
        throw new Error("Failed to fetch IRI-resolution.meta-data.json");
    }
    else {
        console.log("IRI-resolution.meta-data.json loaded")
    }

    // 🔹 Write IRI-resolution. dataset into Emscripten virtual FS
    MyModule.FS.writeFile(
        "IRI-resolution.meta-data.json",
        new Uint8Array(buffer18)
    );

    const response19 = await fetch("/IRI-resolution.vocabulary.codebooks");
    const buffer19 = await response19.arrayBuffer();
    if (!response19.ok) {
        throw new Error("Failed to fetch IRI-resolution.vocabulary.codebooks");
    }

    MyModule.FS.writeFile(
        "IRI-resolution.vocabulary.codebooks",
        new Uint8Array(buffer19)
    );

    const response20 = await fetch("/IRI-resolution.vocabulary.words.external");
    const buffer20 = await response20.arrayBuffer();
    if (!response20.ok) {
        throw new Error("Failed to fetch IRI-resolution.vocabulary.words.external");
    }

    MyModule.FS.writeFile(
        "IRI-resolution.vocabulary.words.external",
        new Uint8Array(buffer20)
    );

    const response21 = await fetch("/IRI-resolution.vocabulary.words.external.offsets");
    const buffer21 = await response21.arrayBuffer();
    if (!response21.ok) {
        throw new Error("Failed to fetch IRI-resolution.vocabulary.words.external.offsets");
    }

    // 🔹 Write IRI-resolution.vocabulary.words.internal dataset into Emscripten virtual FS
    MyModule.FS.writeFile(
        "IRI-resolution.vocabulary.words.external.offsets",
        new Uint8Array(buffer21)
    );

    const response22 = await fetch("/IRI-resolution.vocabulary.words.internal");
    const buffer22 = await response22.arrayBuffer();
    if (!response22.ok) {
        throw new Error("Failed to fetch IRI-resolution.vocabulary.words.internal");
    }

    MyModule.FS.writeFile(
        "IRI-resolution.vocabulary.words.internal",
        new Uint8Array(buffer22)
    );

    const response23 = await fetch("/IRI-resolution.vocabulary.words.internal.ids");
    const buffer23 = await response23.arrayBuffer();
    if (!response23.ok) {
        throw new Error("Failed to fetch IRI-resolution.vocabulary.words.internal.ids");
    }

    // 🔹 Write IRI-resolution.vocabulary.words.internal.ids dataset into Emscripten virtual FS
    MyModule.FS.writeFile(
        "IRI-resolution.vocabulary.words.internal.ids",
        new Uint8Array(buffer23)
    );
}


async function fetch_olympics_index() {
    // 🔹 Fetch RDF file from public/
    const response0 = await fetch("/Olympics.nt.xz");
    const buffer0 = await response0.arrayBuffer();
    if (!response0.ok) {
        throw new Error("Failed to fetch Olympics.nt.xz");
    }
    MyModule.FS.writeFile(
        "Olympics.nt.xz",
        new Uint8Array(buffer0)
    );

    const response1 = await fetch("/Olympics.index.ops");
    const buffer1 = await response1.arrayBuffer();
    if (!response1.ok) {
        throw new Error("Failed to fetch Olympics.index.ops");
    }
    MyModule.FS.writeFile(
        "Olympics.index.ops",
        new Uint8Array(buffer1)
    );

    const response2 = await fetch("/Olympics.index.ops.meta");
    const buffer2 = await response2.arrayBuffer();
    if (!response2.ok) {
        throw new Error("Failed to fetch Olympics.index.ops.meta");
    }
    MyModule.FS.writeFile(
        "Olympics.index.ops.meta",
        new Uint8Array(buffer2)
    );

    const response3 = await fetch("/Olympics.index.osp");
    const buffer3 = await response3.arrayBuffer();
    if (!response3.ok) {
        throw new Error("Failed to fetch Olympics.index.osp");
    }
    MyModule.FS.writeFile(
        "Olympics.index.osp",
        new Uint8Array(buffer3)
    );

    const response4 = await fetch("/Olympics.index.osp.meta");
    const buffer4 = await response4.arrayBuffer();
    if (!response4.ok) {
        throw new Error("Failed to fetch Olympics.index.osp.meta");
    }
    MyModule.FS.writeFile(
        "Olympics.index.osp.meta",
        new Uint8Array(buffer4)
    );

    const response5 = await fetch("/Olympics.index.patterns");
    const buffer5 = await response5.arrayBuffer();
    if (!response5.ok) {
        throw new Error("Failed to fetch Olympics.index.patterns");
    }
    MyModule.FS.writeFile(
        "Olympics.index.patterns",
        new Uint8Array(buffer5)
    );

    const response6 = await fetch("/Olympics.index.pos");
    const buffer6 = await response6.arrayBuffer();
    if (!response6.ok) {
        throw new Error("Failed to fetch Olympics.index.pos");
    }
    MyModule.FS.writeFile(
        "Olympics.index.pos",
        new Uint8Array(buffer6)
    );

    const response7 = await fetch("/Olympics.index.pos.meta");
    const buffer7 = await response7.arrayBuffer();
    if (!response7.ok) {
        throw new Error("Failed to fetch Olympics.index.pos.meta");
    }
    MyModule.FS.writeFile(
        "Olympics.index.pos.meta",
        new Uint8Array(buffer7)
    );

    const response8 = await fetch("/Olympics.index.pso");
    const buffer8 = await response8.arrayBuffer();
    if (!response8.ok) {
        throw new Error("Failed to fetch Olympics.index.pso");
    }
    MyModule.FS.writeFile(
        "Olympics.index.pso",
        new Uint8Array(buffer8)
    );

    const response9 = await fetch("/Olympics.index.pso.meta");
    const buffer9 = await response9.arrayBuffer();
    if (!response9.ok) {
        throw new Error("Failed to fetch Olympics.index.pso.meta");
    }
    MyModule.FS.writeFile(
        "Olympics.index.pso.meta",
        new Uint8Array(buffer9)
    );

    const response10 = await fetch("/Olympics.index.sop");
    const buffer10 = await response10.arrayBuffer();
    if (!response1.ok) {
        throw new Error("Failed to fetch Olympics.index.sop");
    }
    MyModule.FS.writeFile(
        "Olympics.index.sop",
        new Uint8Array(buffer10)
    );

    const response11 = await fetch("/Olympics.index.sop.meta");
    const buffer11 = await response11.arrayBuffer();
    if (!response1.ok) {
        throw new Error("Failed to fetch Olympics.index.sop.meta");
    }
    MyModule.FS.writeFile(
        "Olympics.index.sop.meta",
        new Uint8Array(buffer11)
    );

    const response12 = await fetch("/Olympics.index.spo");
    const buffer12 = await response12.arrayBuffer();
    if (!response12.ok) {
        throw new Error("Failed to fetch Olympics.index.spo");
    }
    MyModule.FS.writeFile(
        "Olympics.index.spo",
        new Uint8Array(buffer12)
    );

    const response13 = await fetch("/Olympics.index.spo.meta");
    const buffer13 = await response13.arrayBuffer();
    if (!response13.ok) {
        throw new Error("Failed to fetch Olympics.index.spo.meta");
    }
    MyModule.FS.writeFile(
        "Olympics.index.spo.meta",
        new Uint8Array(buffer13)
    );

    const response14 = await fetch("/Olympics.internal.index.pos");
    const buffer14 = await response14.arrayBuffer();
    if (!response14.ok) {
        throw new Error("Failed to fetch Olympics.internal.index.pos");
    }
    MyModule.FS.writeFile(
        "Olympics.internal.index.pos",
        new Uint8Array(buffer14)
    );

    const response15 = await fetch("/Olympics.internal.index.pos.meta");
    const buffer15 = await response15.arrayBuffer();
    if (!response15.ok) {
        throw new Error("Failed to fetch Olympics.internal.index.pos.meta");
    }
    MyModule.FS.writeFile(
        "Olympics.internal.index.pos.meta",
        new Uint8Array(buffer15)
    );

    const response16 = await fetch("/Olympics.internal.index.pso");
    const buffer16 = await response16.arrayBuffer();
    if (!response16.ok) {
        throw new Error("Failed to fetch Olympics.internal.index.pso");
    }
    MyModule.FS.writeFile(
        "Olympics.internal.index.pso",
        new Uint8Array(buffer16)
    );

    const response17 = await fetch("/Olympics.internal.index.pso.meta");
    const buffer17 = await response17.arrayBuffer();
    if (!response17.ok) {
        throw new Error("Failed to fetch Olympics.internal.index.pso.meta");
    }
    MyModule.FS.writeFile(
        "Olympics.internal.index.pso.meta",
        new Uint8Array(buffer17)
    );

    const response18 = await fetch("/Olympics.internal.index.pos");
    const buffer18 = await response18.arrayBuffer();
    if (!response18.ok) {
        throw new Error("Failed to fetch Olympics.internal.index.pos");
    }
    MyModule.FS.writeFile(
        "Olympics.internal.index.pos",
        new Uint8Array(buffer18)
    );

    const response19 = await fetch("/Olympics.meta-data.json");
    const buffer19 = await response19.arrayBuffer();
    if (!response19.ok) {
        throw new Error("Failed to fetch Olympics.meta-data.json");
    }
    MyModule.FS.writeFile(
        "Olympics.meta-data.json",
        new Uint8Array(buffer19)
    );

    const response20 = await fetch("/Olympics.vocabulary.codebooks");
    const buffer20 = await response20.arrayBuffer();
    if (!response20.ok) {
        throw new Error("Failed to fetch Olympics.vocabulary.codebooks");
    }
    MyModule.FS.writeFile(
        "Olympics.vocabulary.codebooks",
        new Uint8Array(buffer20)
    );

    const response21 = await fetch("/Olympics.vocabulary.words.external");
    const buffer21 = await response21.arrayBuffer();
    if (!response21.ok) {
        throw new Error("Failed to fetch Olympics.vocabulary.words.external");
    }
    MyModule.FS.writeFile(
        "Olympics.vocabulary.words.external",
        new Uint8Array(buffer21)
    );

    const response22 = await fetch("/Olympics.vocabulary.words.external.offsets");
    const buffer22 = await response22.arrayBuffer();
    if (!response22.ok) {
        throw new Error("Failed to fetch Olympics.vocabulary.words.external.offsets");
    }
    MyModule.FS.writeFile(
        "Olympics.vocabulary.words.external.offsets",
        new Uint8Array(buffer22)
    );

    const response23 = await fetch("/Olympics.vocabulary.words.internal");
    const buffer23 = await response23.arrayBuffer();
    if (!response23.ok) {
        throw new Error("Failed to fetch Olympics.vocabulary.words.internal");
    }
    MyModule.FS.writeFile(
        "Olympics.vocabulary.words.internal",
        new Uint8Array(buffer23)
    );

    const response24 = await fetch("/Olympics.vocabulary.words.internal.ids");
    const buffer24 = await response24.arrayBuffer();
    if (!response24.ok) {
        throw new Error("Failed to fetch Olympics.vocabulary.words.internal.ids");
    }
    MyModule.FS.writeFile(
        "Olympics.vocabulary.words.internal.ids",
        new Uint8Array(buffer24)
    );
}

async function fetch_tbbt_index() {
    // 🔹 Fetch RDF file from public/
    const response0 = await fetch("/tbbt.nt");
    const buffer0 = await response0.arrayBuffer();
    if (!response0.ok) {
        throw new Error("Failed to fetch tbbt.nt");
    }
    // 🔹 Write housemd dataset into Emscripten virtual FS
    MyModule.FS.writeFile(
        "tbbt.nt",
        new Uint8Array(buffer0)
    );

    const response = await fetch("/TBBT.index.ops");
    const buffer = await response.arrayBuffer();
    if (!response.ok) {
        throw new Error("Failed to fetch TBBT.index.ops");
    }

    MyModule.FS.writeFile(
        "TBBT.index.ops",
        new Uint8Array(buffer)
    );

    const response2 = await fetch("/TBBT.index.ops.meta");
    const buffer2 = await response2.arrayBuffer();
    if (!response2.ok) {
        throw new Error("Failed to fetch TBBT.index.ops.meta");
    }

    MyModule.FS.writeFile(
        "TBBT.index.ops.meta",
        new Uint8Array(buffer2)
    );

    const response3 = await fetch("/TBBT.index.osp");
    const buffer3 = await response3.arrayBuffer();
    if (!response3.ok) {
        throw new Error("Failed to fetch TBBT.index.osp");
    }

    MyModule.FS.writeFile(
        "TBBT.index.osp",
        new Uint8Array(buffer3)
    );

    const response4 = await fetch("/TBBT.index.osp.meta");
    const buffer4 = await response4.arrayBuffer();
    if (!response4.ok) {
        throw new Error("Failed to fetch TBBT.index.osp.meta");
    }

    MyModule.FS.writeFile(
        "TBBT.index.osp.meta",
        new Uint8Array(buffer4)
    );

    const response5 = await fetch("/TBBT.index.patterns");
    const buffer5 = await response5.arrayBuffer();
    if (!response5.ok) {
        throw new Error("Failed to fetch TBBT.index.patterns");
    }

    MyModule.FS.writeFile(
        "TBBT.index.patterns",
        new Uint8Array(buffer5)
    );

    const response6 = await fetch("/TBBT.index.pos");
    const buffer6 = await response6.arrayBuffer();
    if (!response6.ok) {
        throw new Error("Failed to fetch TBBT.index.pos");
    }

    MyModule.FS.writeFile(
        "TBBT.index.pos",
        new Uint8Array(buffer6)
    );

    const response7 = await fetch("/TBBT.index.pos.meta");
    const buffer7 = await response7.arrayBuffer();
    if (!response7.ok) {
        throw new Error("Failed to fetch TBBT.index.pos.meta");
    }

    MyModule.FS.writeFile(
        "TBBT.index.pos.meta",
        new Uint8Array(buffer7)
    );

    const response8 = await fetch("/TBBT.index.pso");
    const buffer8 = await response8.arrayBuffer();
    if (!response8.ok) {
        throw new Error("Failed to fetch TBBT.index.pso");
    }

    MyModule.FS.writeFile(
        "TBBT.index.pso",
        new Uint8Array(buffer8)
    );

    const response9 = await fetch("/TBBT.index.pso.meta");
    const buffer9 = await response9.arrayBuffer();
    if (!response9.ok) {
        throw new Error("Failed to fetch TBBT.index.pso.meta");
    }

    MyModule.FS.writeFile(
        "TBBT.index.pso.meta",
        new Uint8Array(buffer9)
    );

    const response10 = await fetch("/TBBT.index.sop");
    const buffer10 = await response10.arrayBuffer();
    if (!response10.ok) {
        throw new Error("Failed to fetch TBBT.index.sop");
    }

    MyModule.FS.writeFile(
        "TBBT.index.sop",
        new Uint8Array(buffer10)
    );

    const response11 = await fetch("/TBBT.index.sop.meta");
    const buffer11 = await response11.arrayBuffer();
    if (!response11.ok) {
        throw new Error("Failed to fetch TBBT.index.sop.meta");
    }

    MyModule.FS.writeFile(
        "TBBT.index.sop.meta",
        new Uint8Array(buffer11)
    );

    const response12 = await fetch("/TBBT.index.spo");
    const buffer12 = await response12.arrayBuffer();
    if (!response12.ok) {
        throw new Error("Failed to fetch TBBT.index.spo");
    }

    MyModule.FS.writeFile(
        "TBBT.index.spo",
        new Uint8Array(buffer12)
    );

    const response13 = await fetch("/TBBT.index.spo.meta");
    const buffer13 = await response13.arrayBuffer();
    if (!response13.ok) {
        throw new Error("Failed to fetch TBBT.index.spo.meta");
    }

    MyModule.FS.writeFile(
        "TBBT.index.spo.meta",
        new Uint8Array(buffer13)
    );

    const response14 = await fetch("/TBBT.internal.index.pos");
    const buffer14 = await response14.arrayBuffer();
    if (!response14.ok) {
        throw new Error("Failed to fetch TBBT.internal.index.pos");
    }

    MyModule.FS.writeFile(
        "TBBT.internal.index.pos",
        new Uint8Array(buffer14)
    );

    const response15 = await fetch("/TBBT.internal.index.pos.meta");
    const buffer15 = await response15.arrayBuffer();
    if (!response15.ok) {
        throw new Error("Failed to fetch TBBT.internal.index.pos.meta");
    }

    MyModule.FS.writeFile(
        "TBBT.internal.index.pos.meta",
        new Uint8Array(buffer15)
    );

    const response16 = await fetch("/TBBT.internal.index.pso");
    const buffer16 = await response16.arrayBuffer();
    if (!response16.ok) {
        throw new Error("Failed to fetch TBBT.internal.index.pso");
    }

    MyModule.FS.writeFile(
        "TBBT.internal.index.pso",
        new Uint8Array(buffer16)
    );

    const response17 = await fetch("/TBBT.internal.index.pso.meta");
    const buffer17 = await response17.arrayBuffer();
    if (!response17.ok) {
        throw new Error("Failed to fetch TBBT.internal.index.pso.meta");
    }

    MyModule.FS.writeFile(
        "TBBT.internal.index.pso.meta",
        new Uint8Array(buffer17)
    );

    const response18 = await fetch("/TBBT.meta-data.json");
    const buffer18 = await response18.arrayBuffer();
    if (!response18.ok) {
        throw new Error("Failed to fetch TBBT.meta-data.json");
    }
    else {
        console.log("TBBT.meta-data.json loaded")
    }

    // 🔹 Write TBBT dataset into Emscripten virtual FS
    MyModule.FS.writeFile(
        "TBBT.meta-data.json",
        new Uint8Array(buffer18)
    );

    const response19 = await fetch("/TBBT.vocabulary.codebooks");
    const buffer19 = await response19.arrayBuffer();
    if (!response19.ok) {
        throw new Error("Failed to fetch TBBT.vocabulary.codebooks");
    }

    MyModule.FS.writeFile(
        "TBBT.vocabulary.codebooks",
        new Uint8Array(buffer19)
    );

    const response20 = await fetch("/TBBT.vocabulary.words.external");
    const buffer20 = await response20.arrayBuffer();
    if (!response20.ok) {
        throw new Error("Failed to fetch TBBT.vocabulary.words.external");
    }

    MyModule.FS.writeFile(
        "TBBT.vocabulary.words.external",
        new Uint8Array(buffer20)
    );

    const response21 = await fetch("/TBBT.vocabulary.words.external.offsets");
    const buffer21 = await response21.arrayBuffer();
    if (!response21.ok) {
        throw new Error("Failed to fetch TBBT.vocabulary.words.external.offsets");
    }

    MyModule.FS.writeFile(
        "TBBT.vocabulary.words.external.offsets",
        new Uint8Array(buffer21)
    );

    const response22 = await fetch("/TBBT.vocabulary.words.internal");
    const buffer22 = await response22.arrayBuffer();
    if (!response22.ok) {
        throw new Error("Failed to fetch TBBT.vocabulary.words.internal");
    }

    MyModule.FS.writeFile(
        "TBBT.vocabulary.words.internal",
        new Uint8Array(buffer22)
    );

    const response23 = await fetch("/TBBT.vocabulary.words.internal.ids");
    const buffer23 = await response23.arrayBuffer();
    if (!response23.ok) {
        throw new Error("Failed to fetch TBBT.vocabulary.words.internal.ids");
    }

    MyModule.FS.writeFile(
        "TBBT.vocabulary.words.internal.ids",
        new Uint8Array(buffer23)
    );
}
/*
        fileSpec.filename = "olympics.nt.xz";
        fileSpec.filetype = MyModule.Filetype.Turtle;
        fileSpec.defaultGraph = 'null'; // ~std::nullopt ?

        // push text and filetype into vector
        vec.push_back(fileSpec);

        // assign vector to config
        config.inputFiles = vec;
        */
