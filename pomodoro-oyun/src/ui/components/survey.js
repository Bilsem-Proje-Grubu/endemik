// 3 soruluk mini anket (1-5). Başlangıçta ve 2 hafta sonra aynı sorular sorulur.
import { h } from '../dom.js';
import { t } from '../../i18n/index.js';
import { CONFIG } from '../../config.js';

/** onSubmit(answers[]) tüm sorular cevaplanınca; onSkip isteğe bağlı. */
export function surveyForm({ phase, onSubmit, onSkip }) {
  const answers = new Array(CONFIG.research.questionCount).fill(0);
  const submit = h('button', { type: 'button', class: 'btn btn-primary btn-block', disabled: true, onClick: () => onSubmit([...answers]) }, t('survey.submit'));
  const questions = answers.map((_, qi) =>
    h('fieldset', { class: 'card survey-q' },
      h('legend', null, `${qi + 1}. ${t(`survey.q${qi + 1}`)}`),
      h('div', { class: 'scale' },
        [1, 2, 3, 4, 5].map((v) => {
          const id = `${phase}-q${qi}-${v}`;
          return h('label', { class: 'scale-opt', for: id },
            h('input', {
              type: 'radio', name: `${phase}-q${qi}`, id, value: v,
              onChange: () => { answers[qi] = v; submit.disabled = answers.some((a) => !a); },
            }),
            h('span', { class: 'scale-dot' }, String(v)));
        })),
      h('div', { class: 'row spread small muted' }, h('span', null, t('survey.low')), h('span', null, t('survey.high')))));
  return h('div', { class: 'stack' },
    h('p', { class: 'muted' }, t(phase === 'baseline' ? 'survey.introBaseline' : 'survey.introFollowup')),
    ...questions,
    submit,
    onSkip ? h('button', { type: 'button', class: 'btn btn-ghost btn-block', onClick: onSkip }, t('survey.skip')) : null);
}
