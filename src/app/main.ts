import Phaser from "phaser";
import {GAME_HEIGHT, GAME_WIDTH} from "./constants";
import {BootScene} from "../scenes/BootScene";
import {MenuScene} from "../scenes/MenuScene";
import {SetupScene} from "../scenes/SetupScene";
import {RaceScene} from "../scenes/RaceScene";
import {ResultsScene} from "../scenes/ResultsScene";
import {OptionsScene} from "../scenes/OptionsScene";

new Phaser.Game({
	type: Phaser.AUTO,
	parent: "game",
	width: GAME_WIDTH,
	height: GAME_HEIGHT,
	pixelArt: true,
	roundPixels: true,
	backgroundColor: "#000000",
	scale: {
		mode: Phaser.Scale.FIT,
		autoCenter: Phaser.Scale.CENTER_BOTH,
	},
	scene: [BootScene, MenuScene, SetupScene, RaceScene, ResultsScene, OptionsScene],
});
