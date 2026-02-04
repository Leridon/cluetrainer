
declare module "*.data.png" {
	var t: Promise<ImageData>;
	export = t;
}

declare module "*.png" {
	const url: string;
	export default url;
}
