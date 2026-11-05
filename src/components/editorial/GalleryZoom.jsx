import PhotoViewer from "./PhotoViewer.jsx";

// Publications and Gallery deliberately share the same fullscreen owner.
export default function GalleryZoom(props) {
  return <PhotoViewer {...props} nested />;
}
