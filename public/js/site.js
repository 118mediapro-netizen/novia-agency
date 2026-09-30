const nav = document.querySelector('.nav');
addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 10), { passive: true });

const links = document.getElementById('links');
document.getElementById('burger').addEventListener('click', () => links.classList.toggle('open'));
links.addEventListener('click', e => { if (e.target.tagName === 'A') links.classList.remove('open'); });

const io = new IntersectionObserver(entries => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

document.getElementById('year').textContent = new Date().getFullYear();

const form = document.getElementById('contact-form');
const msg = document.getElementById('form-msg');
form.addEventListener('submit', async e => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  if (!data.name || (!data.email && !data.phone)) {
    msg.className = 'form-msg err';
    msg.textContent = 'Indiquez votre nom et un email ou un téléphone.';
    return;
  }
  msg.className = 'form-msg';
  msg.textContent = 'Envoi…';
  try {
    const res = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    if (!res.ok) throw new Error((await res.json()).error || 'Erreur');
    form.reset();
    msg.className = 'form-msg ok';
    msg.textContent = 'Merci ! On revient vers vous très vite.';
  } catch (err) {
    msg.className = 'form-msg err';
    msg.textContent = err.message || 'Une erreur est survenue.';
  }
});
