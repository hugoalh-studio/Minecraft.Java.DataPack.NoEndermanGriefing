/*==================
Minecraft Java Data Pack Compiler
	Author & Contributor:
		hugoalh
	Language:
		NodeJS 12
==================*/
const NodeJS = {
	Console: require("console"),
	FileSystem: require("fs"),
	OperatingSystem: require("os"),
	Path: require("path")
};
function FetchConfigurationFile() {
	let Data;
	try {
		Data = JSON.parse(
			NodeJS.FileSystem.readFileSync(
				NodeJS.Path.join(__dirname, "Compiler_Configuration.json"),
				{
					encoding: "utf8",
					flag: "r"
				}
			)
		);
	} catch (error) {
		NodeJS.Console.error(error);
		process.exit(0);
	};
	return Data;
};
const Configuration = FetchConfigurationFile();
const Directory = {
	"Repository": NodeJS.Path.join(__dirname, Configuration["Root"]),
	"Import": NodeJS.Path.join(__dirname, Configuration["Root"], Configuration["Import"]),
	"Export": NodeJS.Path.join(__dirname, Configuration["Root"], Configuration["Export"])
};
if (Directory["Import"].indexOf(Directory["Repository"]) != 0 || Directory["Export"].indexOf(Directory["Repository"]) != 0) {
	NodeJS.Console.error(`⚠ Configuration File Error
::::::::::
Import or export directory is not inside root directory!

Root: ${Directory["Repository"]}
Import: ${Directory["Import"]}
Export: ${Directory["Export"]}
`);
	process.exit(0);
} else {
	NodeJS.Console.log(`ℹ Information
::::::::::
Root: ${Directory["Repository"]}
Import: ${Directory["Import"]}
Export: ${Directory["Export"]}
`);
};
function DetermineIsFolder(Path) {
	const Stat = NodeJS.FileSystem.lstatSync(
		NodeJS.Path.join(Directory["Repository"], Path)
	);
	return Stat.isDirectory();
};
function ReadDirectory(Path) {
	const FileList = NodeJS.FileSystem.readdirSync(
		NodeJS.Path.join(Directory["Repository"], Path),
		{
			encoding: "utf8",
			withFileTypes: false
		}
	);
	const FileListCatalogize = {
		"Folders": [],
		"Files": []
	};
	Promise.allSettled(
		FileList.map((value, index) => {
			new Promise((resolve, reject) => {
				const RDPath = NodeJS.Path.join(Path, value);
				if (DetermineIsFolder(RDPath) == true) {
					FileListCatalogize["Folders"].push(RDPath);
					if (NodeJS.FileSystem.existsSync(
						NodeJS.Path.join(Directory["Export"], RDPath)
					) == false) {
						NodeJS.FileSystem.mkdirSync(
							NodeJS.Path.join(Directory["Export"], RDPath),
							{
								recursive: true
							}
						);
					};
				} else {
					FileListCatalogize["Files"].push(RDPath);
				};
			}).catch((error) => {
			});
		})
	);
	return FileListCatalogize;
};
function FullReadDirectory() {
	let WaitingFolders = ["data"];
	let FileList = ["pack.mcmeta"];
	while (WaitingFolders.length > 0) {
		const ThatFolder = WaitingFolders.shift();
		const FileCatalogizeList = ReadDirectory(ThatFolder);
		FileList.push(...FileCatalogizeList["Files"]);
		WaitingFolders.push(...FileCatalogizeList["Folders"]);
	};
	return FileList;
};
const FileList = FullReadDirectory();
const CompilableFileFormat = [
	".json",
	".mcmeta"
];
const Stat = {
	"FileTotal": FileList.length,
	"FileTouch": 0,
	"SizeBefore": 0,
	"SizeAfter": 0,
	"FailFile": {}
};
function GetFileSize(FullPath) {
	const Stat = NodeJS.FileSystem.lstatSync(FullPath);
	return (Stat.size / 1024);
};
function DetermineIsCompilable(Path) {
	for (let index = 0; index < CompilableFileFormat.length; index++) {
		if (Path.indexOf(CompilableFileFormat[index]) == (Path.length - CompilableFileFormat[index].length)) {
			return true;
		};
	};
};
function CompileFile(Path) {
	try {
		let FileContent = JSON.parse(
			NodeJS.FileSystem.readFileSync(
				NodeJS.Path.join(Directory["Import"], Path),
				{
					encoding: "utf8",
					flag: "r"
				}
			)
		);
		NodeJS.FileSystem.writeFileSync(
			NodeJS.Path.join(Directory["Export"], Path),
			JSON.stringify(FileContent),
			{
				encoding: "utf8",
				flag: "w"
			}
		);
		Stat["SizeAfter"] += GetFileSize(
			NodeJS.Path.join(Directory["Export"], Path)
		);
	} catch (error) {
		Stat["FailFile"][Path] = error;
		CopyFile(Path);
	};
};
function CopyFile(Path) {
	try {
		NodeJS.FileSystem.copyFileSync(
			NodeJS.Path.join(Directory["Import"], Path),
			NodeJS.Path.join(Directory["Export"], Path)
		);
		Stat["SizeAfter"] += GetFileSize(
			NodeJS.Path.join(Directory["Export"], Path)
		);
	} catch (error) {
		Stat["FailFile"][Path] = error;
	};
};
Promise.allSettled(
	FileList.map((value, index) => {
		new Promise((resolve, reject) => {
			Stat["SizeBefore"] += GetFileSize(
				NodeJS.Path.join(Directory["Import"], value)
			);
			if (DetermineIsCompilable(value) == true) {
				Stat["FileTouch"]++;
				CompileFile(value);
			} else {
				CopyFile(value);
			};
		}).catch((error) => {
		});
	})
);
NodeJS.Console.log(`Stat
::::::::::
Files (Compilable / Total): ${Stat["FileTouch"]}/${Stat["FileTotal"]} (${(Stat["FileTouch"] / Stat["FileTotal"]) * 100}%)
Sizes (After / Before) (KB): ${Stat["SizeAfter"]}/${Stat["SizeBefore"]}
Compression Rate: ${100 - (Stat["SizeAfter"] / Stat["SizeBefore"]) * 100}%
Fail File: ${JSON.stringify(Stat["FailFile"])}
`);
