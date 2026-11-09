import warnings
warnings.filterwarnings('ignore')

import numpy as np
import pandas as pd
import joblib
import matplotlib.pyplot as plt
from sklearn.model_selection import (train_test_split, RepeatedStratifiedKFold, StratifiedKFold,
                                     cross_val_score, cross_val_predict, GridSearchCV)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.neighbors import KNeighborsClassifier
from sklearn.inspection import permutation_importance
from sklearn.metrics import (classification_report, confusion_matrix, roc_auc_score, f1_score, accuracy_score, recall_score)

RS = 42
CSV_PATH = 'loan_data.csv'

# ------------------------------------------------------------------ 1. Données
df = pd.read_csv(CSV_PATH)
y = df['Loan_Status']                      # 1 = accordé, 0 = refusé
X = df.drop(columns='Loan_Status')
print('Données :', df.shape, '| manquants :', int(df.isna().sum().sum()))
print('Répartition de la cible :', y.value_counts(normalize=True).round(3).to_dict())

# ------------------------------------------------------------------ 2. Train / test
Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, stratify=y, random_state=RS)
cv = RepeatedStratifiedKFold(n_splits=5, n_repeats=3, random_state=RS)

# ------------------------------------------------------------------ 3. Comparaison des modèles
candidates = {
    'Régression logistique': Pipeline([('s', StandardScaler()), ('m', LogisticRegression(max_iter=2000))]),
    'Random Forest': RandomForestClassifier(n_estimators=300, min_samples_leaf=5, random_state=RS, n_jobs=-1),
    'Gradient Boosting': GradientBoostingClassifier(n_estimators=100, max_depth=2, learning_rate=0.05, random_state=RS),
    'KNN (K=15)': Pipeline([('s', StandardScaler()), ('m', KNeighborsClassifier(15))]),
}
rows = {}
for name, model in candidates.items():
    rows[name] = {label: cross_val_score(model, Xtr, ytr, cv=cv, scoring=sc, n_jobs=-1).mean()
                  for label, sc in [('AUC', 'roc_auc'), ('F1 macro', 'f1_macro'), ('Accuracy', 'accuracy')]}
print('\nComparaison (validation croisée, train) :')
print(pd.DataFrame(rows).T.round(3).sort_values('AUC', ascending=False))

# ------------------------------------------------------------------ 4. Réglage des hyperparamètres
grids = {
    'Régression logistique': (candidates['Régression logistique'], {'m__C': [0.01, 0.03, 0.1, 0.3, 1, 3]}),
    'Random Forest': (candidates['Random Forest'], {'max_depth': [3, 5, 8, None],
                                                    'min_samples_leaf': [3, 5, 10, 20],
                                                    'max_features': ['sqrt', 0.5]}),
    'Gradient Boosting': (candidates['Gradient Boosting'], {'n_estimators': [50, 100, 200],
                                                            'max_depth': [1, 2, 3],
                                                            'learning_rate': [0.02, 0.05, 0.1],
                                                            'subsample': [0.7, 1.0]}),
}
tuned = {}
print('\nRéglage :')
for name, (model, grid) in grids.items():
    gs = GridSearchCV(model, grid, cv=cv, scoring='roc_auc', n_jobs=-1).fit(Xtr, ytr)
    tuned[name] = gs
    print(f'  {name:22s} AUC CV = {gs.best_score_:.3f}  {gs.best_params_}')

best_name = max(tuned, key=lambda n: tuned[n].best_score_)
best_model = tuned[best_name].best_estimator_
print('\nMeilleur modèle :', best_name)

# ------------------------------------------------------------------ 5. Seuil (sans utiliser le test)
oof = cross_val_predict(best_model, Xtr, ytr, cv=StratifiedKFold(5, shuffle=True, random_state=RS),
                        method='predict_proba')[:, 1]
ths = np.arange(0.30, 0.86, 0.01)
f1s = [f1_score(ytr, (oof >= t).astype(int), average='macro') for t in ths]
THRESH = float(ths[int(np.argmax(f1s))])
print('Seuil retenu :', round(THRESH, 2))

# ------------------------------------------------------------------ 6. Évaluation sur le test
proba_te = best_model.predict_proba(Xte)[:, 1]
pred = (proba_te >= THRESH).astype(int)
print('\nTEST : accuracy =', round(accuracy_score(yte, pred), 3),
      '| F1 macro =', round(f1_score(yte, pred, average='macro'), 3),
      '| AUC =', round(roc_auc_score(yte, proba_te), 3),
      '| rappel refusé =', round(recall_score(yte, pred, pos_label=0), 3))
print(classification_report(yte, pred, target_names=['Refusé (0)', 'Accordé (1)']))
print('Matrice de confusion [[VN FP], [FN VP]] :\n', confusion_matrix(yte, pred))

# Importance des variables
imp = permutation_importance(best_model, Xte, yte, scoring='roc_auc', n_repeats=30, random_state=RS, n_jobs=-1)
imp_s = pd.Series(imp.importances_mean, index=X.columns).sort_values()
print('\nImportance des variables (baisse d\'AUC) :')
print(imp_s.tail(6).round(3))
imp_s.plot.barh(figsize=(8, 5.5), color='#2a7ab0', title="Importance des variables (baisse d'AUC)")
plt.tight_layout()
plt.savefig('importance_variables.png', dpi=130)

# ------------------------------------------------------------------ 7. Sauvegarde + prédiction
joblib.dump({'model': best_model, 'threshold': THRESH, 'columns': list(X.columns)}, 'modele_credit.joblib')


def predire(client: dict):
    """client : dict avec les 16 colonnes de X (revenus et montant AU LOG, comme dans le CSV)."""
    obj = joblib.load('modele_credit.joblib')
    row = pd.DataFrame([client])[obj['columns']]
    p = obj['model'].predict_proba(row)[0, 1]
    return p, ('ACCORDÉ' if p >= obj['threshold'] else 'REFUSÉ')


p, decision = predire(Xte.iloc[0].to_dict())
print(f"\nExemple : probabilité d'accord = {p:.0%} -> {decision} "
      f"(réel : {'accordé' if yte.iloc[0] == 1 else 'refusé'})")