// Compte : connexion par lien envoyé par e-mail (Supabase Auth), seulement si le site est relié à sa base.
import { configure, client } from "./supabase.js";

const indispo = document.querySelector("[data-compte-indispo]");
const form = document.querySelector("[data-compte-form]");
const etat = document.querySelector("[data-compte-etat]");
const connecte = document.querySelector("[data-compte-connecte]");

if (configure()) {
  client().then((sb) => {
    indispo.hidden = true;
    const afficher = (session) => {
      form.hidden = Boolean(session);
      connecte.hidden = !session;
      if (session) connecte.querySelector("[data-compte-email]").textContent = session.user.email;
    };
    sb.auth.getSession().then(({ data }) => afficher(data.session));
    sb.auth.onAuthStateChange((_e, session) => afficher(session));
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!form.email.checkValidity()) { etat.textContent = "Saisissez une adresse e-mail valide."; return; }
      const { error } = await sb.auth.signInWithOtp({ email: form.email.value.trim(), options: { emailRedirectTo: location.href } });
      etat.textContent = error ? "L'envoi a échoué. Réessayez dans quelques minutes." : "Un lien de connexion vient de vous être envoyé. Ouvrez-le depuis cet appareil.";
    });
    connecte.querySelector("[data-compte-deconnexion]").addEventListener("click", () => sb.auth.signOut());
  }).catch(() => {
    indispo.querySelector("p").textContent = "Le service de connexion ne répond pas. Réessayez plus tard ; vos favoris et listes restent disponibles sur cet appareil.";
  });
}
