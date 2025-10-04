// lazy-load-video.directive.ts
import {
  Directive,
  ElementRef,
  AfterViewInit,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Directive({
  selector: '[appLazyLoadVideo]',
})
export class LazyLoadVideoDirective implements AfterViewInit {
  constructor(
    private el: ElementRef<HTMLVideoElement>,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return; // SSR safe

    const video: HTMLVideoElement = this.el.nativeElement;

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Start loading and playing the video
            const sources = video.querySelectorAll('source');
            sources.forEach((source) => {
              source.src = source.dataset['src']!;
            });
            video.load();
            video.muted = true;
            video.playsInline = true;
            video.play();
            obs.unobserve(video);
          }
        });
      },
      { threshold: 0.25 }
    ); // triggers when 25% visible

    observer.observe(video);
  }
}
