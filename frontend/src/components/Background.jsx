// Background animated grid + blobs
export default function Background() {
  return (
    <div className="bg-canvas" aria-hidden="true">
      <div className="bg-blob bg-blob-1" />
      <div className="bg-blob bg-blob-2" />
    </div>
  );
}
