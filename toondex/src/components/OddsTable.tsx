import { RARITIES, RARITY_ORDER, CARDS_BY_RARITY } from "@/lib/catalogue";
import { CRAFT_COST, GOLD_ODDS, LAST_SLOT_ODDS, SHARDS_PER_DUPLICATE, SLOT_ODDS, percent } from "@/lib/rules";

export function OddsTable() {
  return (
    <div className="table-wrap">
      <table className="odds">
        <caption className="sr-only">Chances de tirage, éclats et prix de fabrication par rareté</caption>
        <thead>
          <tr>
            <th scope="col">Rareté</th>
            <th scope="col">Cartes</th>
            <th scope="col">Cartes 1 à 4</th>
            <th scope="col">Carte 5</th>
            <th scope="col">Doublon</th>
            <th scope="col">Fabrication</th>
          </tr>
        </thead>
        <tbody>
          {RARITY_ORDER.map((r) => (
            <tr key={r}>
              <th scope="row">
                <span className={`rarity rarity--${r}`}>{RARITIES[r].label}</span>
              </th>
              <td>{CARDS_BY_RARITY[r].length}</td>
              <td>{percent(SLOT_ODDS[r])}</td>
              <td>{LAST_SLOT_ODDS[r] ? percent(LAST_SLOT_ODDS[r]) : "·"}</td>
              <td>+{SHARDS_PER_DUPLICATE[r]} éclats</td>
              <td>{CRAFT_COST[r]} éclats</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="muted small">
        Chaque carte a aussi 1 chance sur {GOLD_ODDS} d’être en <span className="gold-text">version or</span>. Un
        doublon or rapporte 5 fois plus d’éclats. Les versions or ne se fabriquent pas.
      </p>
    </div>
  );
}
