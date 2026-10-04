// Admissions status: one setting (src/data/settings.yaml › admissions.state) drives the Home pill
// and the Admissions banner (OPEN-QUESTIONS #11). Wording and colours follow the HomeDesktop and
// AdmissionsDesktop board scripts exactly; the academic year rolls over in June.
import { academicYearLabel, academicYearStart } from './academic-year';

export type AdmissionsState = 'closed' | 'open' | 'opening';

export function admissionsPill(state: AdmissionsState, date = new Date()) {
  const start = academicYearStart(date);
  const ay = academicYearLabel;
  if (state === 'open')
    return { label: `Admissions ${ay(start)}: open`, action: 'Apply online', dot: '#F89A1C', ring: 'rgba(248, 154, 28, 0.3)', dotL: '#1F7A3D', ringL: 'rgba(31, 122, 61, 0.2)' };
  if (state === 'opening')
    return { label: `Admissions ${ay(start + 1)}: registration opens in March`, action: 'Register interest', dot: '#F5C400', ring: 'rgba(245, 196, 0, 0.3)', dotL: '#A35500', ringL: 'rgba(163, 85, 0, 0.2)' };
  return { label: `Admissions ${ay(start)}: closed`, action: 'Enquire for next year', dot: '#CDBFB4', ring: 'rgba(205, 191, 180, 0.25)', dotL: '#857A71', ringL: 'rgba(133, 122, 113, 0.2)' };
}

export function admissionsBanner(state: AdmissionsState, statusText = '', date = new Date()) {
  const start = academicYearStart(date);
  const ay = academicYearLabel;
  let s;
  if (state === 'open')
    s = { label: `Admissions ${ay(start)} · Open`, text: `Admissions for ${ay(start)} are open. Collect the application form from the school’s front office.`, bar: '#1F7A3D', iconBg: '#1F7A3D', icon: 'check', labelColor: '#1F7A3D' };
  else if (state === 'opening')
    s = { label: `Admissions ${ay(start + 1)} · Opening in March`, text: `Registrations for ${ay(start + 1)} open from March. Enquire now to be informed.`, bar: '#F89A1C', iconBg: '#A35500', icon: 'clock', labelColor: '#A35500' };
  else
    s = { label: `Admissions ${ay(start)} · Closed`, text: `Admissions for ${ay(start)} are closed. Registrations open from March. Enquire now to be informed.`, bar: '#857A71', iconBg: '#5C534D', icon: 'info', labelColor: '#5C534D' };
  if (statusText.trim()) s.text = statusText.trim();
  return s;
}
