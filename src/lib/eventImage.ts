// With Cloudinary set up (firebase/README.md), cover photos are uploaded
// there and the event stores the photo's address. Without it, the photo is
// stored inside the event itself.
const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined;

// Phone photos are often 4000px+ and several MB. Inside the event (a
// Firestore document holds at most 1 MB) the cover is shrunk until it fits
// comfortably; that also makes the home page load faster.
const WIDTHS = [1600, 1280, 1024, 800];
const MAX_CHARS = 700_000;

function shrink(file: File, maxWidth: number, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxWidth / img.naturalWidth);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not read that image."))), "image/jpeg", quality);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file is not an image this browser can open."));
    };
    img.src = url;
  });
}

const toDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

async function uploadToCloudinary(file: File): Promise<string> {
  const form = new FormData();
  // Still sized down first: a cover never needs more, and uploads are faster
  form.append("file", await shrink(file, 2400, 0.9));
  form.append("upload_preset", uploadPreset!);
  form.append("folder", "pro-am/events");
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: form });
  const data = (await res.json().catch(() => ({}))) as { secure_url?: string; error?: { message?: string } };
  if (!res.ok || !data.secure_url) throw new Error(data.error?.message ?? "The photo couldn't be uploaded. Try again.");
  // Served in the best format and quality for each browser, at most 2000px wide
  return data.secure_url.replace("/image/upload/", "/image/upload/f_auto,q_auto,w_2000,c_limit/");
}

// Returns the cover photo's address, ready to store on the event
export async function uploadEventImage(file: File): Promise<string> {
  if (cloudName && uploadPreset) return uploadToCloudinary(file);
  for (const width of WIDTHS) {
    const url = await toDataUrl(await shrink(file, width, 0.8));
    if (url.length <= MAX_CHARS) return url;
  }
  throw new Error("That photo is too detailed to use. Try a different one.");
}
