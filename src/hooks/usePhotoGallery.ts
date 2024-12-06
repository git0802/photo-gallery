import {
  Camera,
  CameraResultType,
  CameraSource,
  Photo,
} from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Preferences } from "@capacitor/preferences";
import { isPlatform } from "@ionic/react";
import { useEffect, useState } from "react";

export interface UserPhoto {
  filepath: string;
  webviewPath?: string;
}

const PHOTO_STORAGE = "photos";

export function usePhotoGallery() {
  const [photos, setPhotos] = useState<UserPhoto[]>([]);

  const savePicture = async (
    photo: Photo,
    fileName: string
  ): Promise<UserPhoto> => {
    let base64Data: string | Blob;

    if (isPlatform("hybrid")) {
      const file = await Filesystem.readFile({
        path: photo.path!,
      });
      base64Data = file.data;
    } else {
      base64Data = await base64FromPath(photo.webPath!);
    }

    const savedFile = await Filesystem.writeFile({
      path: fileName,
      data: base64Data,
      directory: Directory.Data,
    });

    if (isPlatform("hybrid")) {
      return {
        filepath: savedFile.uri,
        webviewPath: Capacitor.convertFileSrc(savedFile.uri),
      };
    } else {
      return {
        filepath: fileName,
        webviewPath: photo.webPath,
      };
    }
  };

  const takePhoto = async () => {
    const photo = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      quality: 100,
    });

    const fileName = Date.now() + ".jpeg";
    // const newPhotos = [
    //   {
    //     filepath: fileName,
    //     webviewPath: photo.webPath,
    //   },
    //   ...photos,
    // ];
    const savedFileImage = await savePicture(photo, fileName);
    const newPhotos = [savedFileImage, ...photos];
    setPhotos(newPhotos);
  };

  const loadSaved = async () => {
    const { value } = await Preferences.get({ key: PHOTO_STORAGE });
    const photoInPreferences = (value ? JSON.parse(value) : []) as UserPhoto[];

    if (!isPlatform("hybrid")) {
      for (let photo of photoInPreferences) {
        const file = await Filesystem.readFile({
          path: photo.filepath,
          directory: Directory.Data,
        });

        photo.webviewPath = `data:image/jpeg;base64,${file.data}`;
      }
    }
    setPhotos(photoInPreferences);
  };

  useEffect(() => {
    loadSaved();
  }, []);

  return {
    photos,
    takePhoto,
  };
}

export async function base64FromPath(path: string): Promise<string> {
  const response = await fetch(path);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject("method did not return a string");
      }
    };
    reader.readAsDataURL(blob);
  });
}
