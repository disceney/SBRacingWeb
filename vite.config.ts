import {defineConfig} from "vite";

export default defineConfig({
	// Chemins relatifs : le bundle fonctionne en local, en preview et sous
	// le sous-chemin /SBRacingWeb/ de GitHub Pages.
	base: "./",
	server: {
		port: 5173,
	},
	build: {
		target: "es2022",
	},
});
