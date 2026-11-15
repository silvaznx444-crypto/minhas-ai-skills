/** Lê uma imagem enviada pelo restaurante e reduz para caber no armazenamento (JPEG, lado máx. `max`). */
export function readImage(file: File, max = 1000, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Envie um arquivo de imagem (JPG, PNG ou WebP).'));
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      // PNG com transparência (logo) continua PNG
      const png = file.type === 'image/png' && max <= 400;
      resolve(canvas.toDataURL(png ? 'image/png' : 'image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Não foi possível ler essa imagem.'));
    };
    img.src = url;
  });
}
