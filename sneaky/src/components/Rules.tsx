import { POINTS, SABOTAGES } from '../../shared/constants.ts';

export function Rules() {
  return (
    <div className="rules">
      <section>
        <h3>🎯 Le principe</h3>
        <p>
          Vous jouez <strong>ensemble, dans la même pièce</strong>, chacun sur son téléphone. La partie se joue en plusieurs{' '}
          <strong>séries</strong> de questions de culture générale. À chaque série, un joueur tiré au sort devient{' '}
          <strong className="red">la taupe</strong> : il connaît toutes les réponses. Personne ne sait qui c’est.
        </p>
      </section>
      <section>
        <h3>🧠 Les questions</h3>
        <p>
          Chaque question est une mission d’équipe. Tout le monde répond sur son téléphone, et vous avez le droit (et même le devoir) de{' '}
          <strong>débattre à voix haute</strong> avant de verrouiller. La mission est réussie si la <strong>réponse majoritaire</strong> est
          la bonne. En cas d’égalité, elle échoue.
        </p>
        <p>
          Après chaque question, un tableau montre à tout le monde <strong>qui a eu juste et qui a eu faux</strong> (et, si le chef l’a
          activé, la réponse choisie par chacun). Un joueur qui ne se trompe jamais devient vite suspect…
        </p>
        <p>
          La taupe voit la bonne réponse dans son <strong>dossier</strong>. Son but : faire échouer les missions en orientant le débat… sans
          paraître trop sûre d’elle. Tout le monde possède un dossier identique : ouvrez-le aussi pour brouiller les pistes.
        </p>
      </section>
      <section>
        <h3>🗂️ Les indices</h3>
        <p>
          Toutes les 2 missions réussies, l’équipe débloque un <strong>indice</strong> (3 maximum par série), révélé à la réunion suivante :
          agent blanchi, réponse interceptée de la taupe, périmètre de suspects, profil de réponses…
        </p>
      </section>
      <section>
        <h3>🚨 Réunions & votes</h3>
        <p>
          À la fin de chaque série, un <strong>briefing</strong> a lieu : débat, accusations, puis vote. Entre deux questions, chaque agent
          peut aussi déclencher une <strong>réunion d’urgence</strong> (une fois par partie, par défaut).
        </p>
        <p>
          Le joueur qui reçoit le plus de votes (et plus de votes que de « passer ») est démasqué. Si c’est la taupe, la série s’arrête et
          les agents gagnent. Si c’est un innocent, il est <strong>écarté</strong> : il ne vote plus de la série.
        </p>
      </section>
      <section>
        <h3>🕶️ Les gadgets de la taupe</h3>
        <ul>
          {Object.values(SABOTAGES).map((s) => (
            <li key={s.label}>
              <strong>
                {s.emoji} {s.label}
              </strong>{' '}
              — {s.description}
            </li>
          ))}
        </ul>
        <p className="muted">Chaque gadget est utilisable une fois par série. Les sabotages de question sont annoncés à tous.</p>
      </section>
      <section>
        <h3>🏆 Les points</h3>
        <table className="points">
          <tbody>
            <tr>
              <td>Bonne réponse (agent)</td>
              <td>+{POINTS.agentCorrect}</td>
            </tr>
            <tr>
              <td>Voter contre la taupe</td>
              <td>+{POINTS.agentVotedMole}</td>
            </tr>
            <tr>
              <td>Taupe démasquée (chaque agent)</td>
              <td>+{POINTS.agentTeamCatch}</td>
            </tr>
            <tr>
              <td>Faire écarter un innocent</td>
              <td>{POINTS.agentVotedInnocent}</td>
            </tr>
            <tr className="red">
              <td>Taupe : mission échouée</td>
              <td>+{POINTS.moleFail}</td>
            </tr>
            <tr className="red">
              <td>Taupe : vote d’un agent sur un innocent</td>
              <td>+{POINTS.moleMisdirect}</td>
            </tr>
            <tr className="red">
              <td>Taupe : non démasquée en fin de série</td>
              <td>+{POINTS.moleEscape}</td>
            </tr>
            <tr className="red">
              <td>Taupe : démasquée</td>
              <td>{POINTS.moleCaught}</td>
            </tr>
          </tbody>
        </table>
        <p className="muted">Les scores sont cachés pendant une série (sinon la taupe serait trop facile à repérer) et révélés à la fin.</p>
      </section>
      <section>
        <h3>💡 Conseils</h3>
        <ul>
          <li>Observez qui verrouille vite, qui hésite, qui insiste trop.</li>
          <li>Notez vos soupçons dans le carnet du dossier : il est privé.</li>
          <li>Taupe : trop de bonnes réponses te trahiront, trop de mauvaises aussi. Dose.</li>
          <li>Posez les téléphones pendant les réunions et regardez-vous dans les yeux.</li>
        </ul>
      </section>
    </div>
  );
}
