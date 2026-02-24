import React, { useState, useRef, useCallback, useEffect } from 'react';

/**
 * ImageSlider - Swipeable image carousel with touch & mouse drag support
 * 
 * @param {string[]} images - Array of image URLs
 * @param {number} currentIndex - Current active image index (controlled)
 * @param {function} onIndexChange - Callback when index changes
 * @param {string} alt - Alt text base for images
 * @param {string} className - Additional CSS classes for the image
 * @param {string} containerClassName - Additional CSS classes for the container
 * @param {React.ReactNode} children - Overlay content rendered on top of images
 * @param {boolean} showArrows - Show navigation arrows (default: true)
 * @param {boolean} showDots - Show dot indicators (default: true)
 * @param {boolean} showCounter - Show image counter badge (default: false)
 * @param {string} dotsPosition - 'bottom' (overlay) or 'below' (separate row)
 * @param {boolean} isDarkMode - Dark mode styling
 * @param {number} swipeThreshold - Min px to trigger swipe (default: 50)
 * @param {React.ReactNode} linkWrapper - Optional wrapper (e.g. Link) for the image
 */
const ImageSlider = ({
  images = [],
  currentIndex = 0,
  onIndexChange,
  alt = 'Image',
  className = '',
  containerClassName = '',
  children,
  showArrows = true,
  showDots = true,
  showCounter = false,
  dotsPosition = 'bottom',
  isDarkMode = false,
  swipeThreshold = 50,
  linkWrapper,
}) => {
  const containerRef = useRef(null);
  const [dragState, setDragState] = useState({
    isDragging: false,
    startX: 0,
    currentX: 0,
    startY: 0,
  });

  const imageCount = images.length;

  const goTo = useCallback((index) => {
    if (onIndexChange) {
      onIndexChange(((index % imageCount) + imageCount) % imageCount);
    }
  }, [onIndexChange, imageCount]);

  const goNext = useCallback((e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    goTo(currentIndex + 1);
  }, [currentIndex, goTo]);

  const goPrev = useCallback((e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    goTo(currentIndex - 1);
  }, [currentIndex, goTo]);

  // --- Touch handlers ---
  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    setDragState({
      isDragging: true,
      startX: touch.clientX,
      currentX: touch.clientX,
      startY: touch.clientY,
    });
  }, []);

  const handleTouchMove = useCallback((e) => {
    if (!dragState.isDragging) return;
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - dragState.startX);
    const deltaY = Math.abs(touch.clientY - dragState.startY);
    
    // If horizontal movement is greater, prevent vertical scroll
    if (deltaX > deltaY && deltaX > 10) {
      e.preventDefault();
    }
    
    setDragState(prev => ({ ...prev, currentX: touch.clientX }));
  }, [dragState.isDragging, dragState.startX, dragState.startY]);

  const handleTouchEnd = useCallback(() => {
    if (!dragState.isDragging) return;
    const deltaX = dragState.currentX - dragState.startX;
    
    if (Math.abs(deltaX) > swipeThreshold) {
      if (deltaX < 0) {
        goTo(currentIndex + 1); // Swipe left → next
      } else {
        goTo(currentIndex - 1); // Swipe right → prev
      }
    }
    
    setDragState({ isDragging: false, startX: 0, currentX: 0, startY: 0 });
  }, [dragState, swipeThreshold, currentIndex, goTo]);

  // --- Mouse drag handlers ---
  const handleMouseDown = useCallback((e) => {
    // Only left mouse button
    if (e.button !== 0) return;
    e.preventDefault();
    setDragState({
      isDragging: true,
      startX: e.clientX,
      currentX: e.clientX,
      startY: e.clientY,
    });
  }, []);

  const handleMouseMove = useCallback((e) => {
    if (!dragState.isDragging) return;
    e.preventDefault();
    setDragState(prev => ({ ...prev, currentX: e.clientX }));
  }, [dragState.isDragging]);

  const handleMouseUp = useCallback(() => {
    if (!dragState.isDragging) return;
    const deltaX = dragState.currentX - dragState.startX;
    
    if (Math.abs(deltaX) > swipeThreshold) {
      if (deltaX < 0) {
        goTo(currentIndex + 1);
      } else {
        goTo(currentIndex - 1);
      }
    }
    
    setDragState({ isDragging: false, startX: 0, currentX: 0, startY: 0 });
  }, [dragState, swipeThreshold, currentIndex, goTo]);

  // Global mouse up listener to handle mouse release outside container
  useEffect(() => {
    if (dragState.isDragging) {
      const handleGlobalMouseUp = () => handleMouseUp();
      const handleGlobalMouseMove = (e) => handleMouseMove(e);
      
      window.addEventListener('mouseup', handleGlobalMouseUp);
      window.addEventListener('mousemove', handleGlobalMouseMove);
      
      return () => {
        window.removeEventListener('mouseup', handleGlobalMouseUp);
        window.removeEventListener('mousemove', handleGlobalMouseMove);
      };
    }
  }, [dragState.isDragging, handleMouseUp, handleMouseMove]);

  if (imageCount === 0) return null;

  // Calculate visual drag offset for smooth feedback
  const dragOffset = dragState.isDragging ? dragState.currentX - dragState.startX : 0;

  const imageElement = (
    <img
      src={images[currentIndex] || images[0]}
      alt={`${alt} - Photo ${currentIndex + 1}`}
      className={`w-full h-full object-cover object-center transition-transform duration-300 ${
        dragState.isDragging ? 'cursor-grabbing' : 'cursor-grab'
      } ${className}`}
      style={{
        transform: dragState.isDragging ? `translateX(${dragOffset * 0.4}px)` : 'translateX(0)',
        transition: dragState.isDragging ? 'none' : 'transform 0.3s ease-out',
        userSelect: 'none',
        WebkitUserDrag: 'none',
      }}
      draggable={false}
    />
  );

  const dotsOverlay = showDots && imageCount > 1 && dotsPosition === 'bottom' && (
    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
      {images.map((_, idx) => (
        <button
          key={idx}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); goTo(idx); }}
          className={`h-1.5 rounded-full transition-all ${
            idx === currentIndex
              ? 'w-5 bg-white'
              : 'w-1.5 bg-white/50 hover:bg-white/70'
          }`}
        />
      ))}
    </div>
  );

  const dotsBelow = showDots && imageCount > 1 && dotsPosition === 'below' && (
    <div className={`flex justify-center gap-2 py-3 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
      {images.map((_, idx) => (
        <button
          key={idx}
          onClick={() => goTo(idx)}
          className={`h-2 rounded-full transition-all ${
            idx === currentIndex
              ? `w-6 ${isDarkMode ? 'bg-cyan-400' : 'bg-blue-600'}`
              : `w-2 ${isDarkMode ? 'bg-gray-600 hover:bg-gray-500' : 'bg-gray-300 hover:bg-gray-400'}`
          }`}
        />
      ))}
    </div>
  );

  return (
    <div className={containerClassName}>
      <div
        ref={containerRef}
        className="relative select-none touch-pan-y"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        style={{ touchAction: 'pan-y pinch-zoom' }}
      >
        {/* Image (optionally wrapped in a link) */}
        {linkWrapper
          ? React.cloneElement(linkWrapper, { className: `${linkWrapper.props.className || ''} block w-full h-full` }, imageElement)
          : imageElement
        }

        {/* Overlay children (gradients, text, etc.) */}
        {children}

        {/* Navigation Arrows */}
        {showArrows && imageCount > 1 && (
          <>
            <button
              onClick={goPrev}
              className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 sm:w-10 sm:h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-all backdrop-blur-sm"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goNext}
              className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 sm:w-10 sm:h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center transition-all backdrop-blur-sm"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        )}

        {/* Image Counter */}
        {showCounter && imageCount > 1 && (
          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium z-10">
            {currentIndex + 1} / {imageCount}
          </div>
        )}

        {/* Dots overlay */}
        {dotsOverlay}
      </div>

      {/* Dots below (separate row) */}
      {dotsBelow}
    </div>
  );
};

export default ImageSlider;
