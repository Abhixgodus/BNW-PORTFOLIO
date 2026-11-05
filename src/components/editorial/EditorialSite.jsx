import { Header, Footer } from "./Chrome.jsx";
import Home from "./Home.jsx";
import Gallery from "./Gallery.jsx";
import { About, Contact } from "./AboutContact.jsx";
import PhotoViewer from "./PhotoViewer.jsx";
import CollectionViewer from "./CollectionViewer.jsx";
import { usePhotoViewer } from "./usePhotoViewer.js";
import { useEditorialMotion } from "./useEditorialMotion.js";
import { useLargePhotoMotion } from "./useLargePhotoMotion.js";
import { useState } from "react";
import { useEditorialNavigation } from "./navigation.js";
import { Journal, JournalPost } from "./Journal.jsx";
export default function EditorialSite({
  page: initialPage = "home",
  post = null,
}) {
  const [page, setPage] = useState(initialPage);
  const [routePage, setRoutePage] = useState(initialPage);
  const [galleryPreview, setGalleryPreview] = useState(null);
  const { rootRef, loadingRef, progress } = useEditorialMotion(page);
  useLargePhotoMotion(rootRef, page);
  const { viewer, close, change, jump, openCollection } = usePhotoViewer();
  useEditorialNavigation(
    rootRef,
    page,
    setPage,
    close,
    setGalleryPreview,
    setRoutePage,
  );
  return (
    <div className={"fg-site ed-site ed-" + page} id="top" ref={rootRef}>
      <a className="fg-skip" href="#main">
        Skip to content
      </a>
      {progress !== null && (
        <div ref={loadingRef} className="ed-loading" aria-hidden="true">
          <span>0%</span>
          <i />
        </div>
      )}
      <Header
        page={["blog", "post"].includes(routePage) ? "journal" : routePage}
      />
      <main id="main">
        {page === "home" && <Home openCollection={openCollection} />}
        {page === "gallery" && (
          <Gallery
            openCollection={openCollection}
            activeSlug={viewer?.gallery ? viewer.slug : null}
            hovered={galleryPreview}
            setHovered={setGalleryPreview}
          />
        )}
        {page === "about" && <About openCollection={openCollection} />}
        {page === "contact" && <Contact />}
        {page === "blog" && <Journal />}
        {page === "post" && post && <JournalPost post={post} />}
      </main>
      {page !== "gallery" && <Footer page={page} />}
      {viewer?.gallery && (
        <CollectionViewer
          {...viewer}
          onClose={close}
          onJump={jump}
          onHoverReturn={setGalleryPreview}
        />
      )}
      {viewer && !viewer.gallery && (
        <PhotoViewer
          {...viewer}
          onClose={close}
          onChange={change}
          onJump={jump}
        />
      )}
    </div>
  );
}
