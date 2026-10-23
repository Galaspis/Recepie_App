// Renders the brand icon into every size the app needs.
//   node scripts/make-icons.mjs        (run from apps/mobile)
// Source: assets/brand/icon-source.png (square, 1024px).
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve(import.meta.dirname, "..");
const src = await readFile(path.join(root, "assets/brand/icon-source.png"));
const CREAM = "#F9F2E6";

const out = async (file, buffer) => {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, buffer);
  console.log("wrote", path.relative(root, file));
};
const square = (size) => sharp(src).resize(size, size, { fit: "cover" }).png().toBuffer();
// Small sizes: zoom into the subject so it still reads at 16-32px.
const zoomed = (size) =>
  sharp(src).extract({ left: 130, top: 110, width: 780, height: 780 }).resize(size, size).png().toBuffer();

// App icon (iOS / stores) and PWA icons.
await out(path.join(root, "assets/images/icon.png"), await square(1024));
await out(path.join(root, "public/icon.png"), await square(1024));
await out(path.join(root, "public/icon-512.png"), await square(512));
await out(path.join(root, "public/icon-192.png"), await square(192));
await out(path.join(root, "public/apple-touch-icon.png"), await square(180));
// Favicons.
await out(path.join(root, "public/favicon-32.png"), await zoomed(32));
await out(path.join(root, "public/favicon-16.png"), await zoomed(16));
await out(path.join(root, "assets/images/favicon.png"), await zoomed(48));
// Splash: the icon centred on cream.
await out(path.join(root, "assets/images/splash-icon.png"), await square(512));
// Android adaptive icon: full-bleed cream background, subject inside the safe zone.
const fg = await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([{ input: await square(680), gravity: "center" }])
  .png()
  .toBuffer();
await out(path.join(root, "assets/images/android-icon-foreground.png"), fg);
await out(
  path.join(root, "assets/images/android-icon-background.png"),
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: CREAM } }).png().toBuffer(),
);
// Monochrome (Android themed icons): dark subject as alpha.
const mono = await sharp(src)
  .resize(680, 680, { fit: "cover" })
  .greyscale()
  .negate()
  .toColourspace("b-w")
  .toBuffer();
const monoCanvas = await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite([
    {
      input: await sharp({ create: { width: 680, height: 680, channels: 4, background: "#000000" } })
        .joinChannel(mono)
        .png()
        .toBuffer(),
      gravity: "center",
    },
  ])
  .png()
  .toBuffer();
await out(path.join(root, "assets/images/android-icon-monochrome.png"), monoCanvas);
