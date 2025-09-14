const setVH = () => {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
};
setVH();
window.addEventListener('resize', setVH);

const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
document.documentElement.classList.toggle('pwa', !!standalone);
