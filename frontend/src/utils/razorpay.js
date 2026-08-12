const SRC = 'https://checkout.razorpay.com/v1/checkout.js';

let pending = null;

export default function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(true);
  if (pending) return pending;

  pending = new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = SRC;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      script.remove();
      pending = null;
      resolve(false);
    };
    document.body.appendChild(script);
  });

  return pending;
}
