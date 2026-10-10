import { Accessibility } from './Accessibility';
import logo from '../../../assets/logo-1-web.png';

export function Header() {
  return <>
    <a className="skip-link" href="#main-content">Skip to main content</a>
    <header className="site-header">
      <a className="brand" href="/" aria-label="RecurrSave home"><img className="brand-logo" src={logo} alt="Nest by Starling Engine" width={1200} height={538} /><small>RecurrSave · Small saves. Big possibilities.</small></a>
      <div className="header-actions"><span className="demo-badge"><span className="status-dot" /> Hackathon demo</span><Accessibility /></div>
    </header>
  </>;
}
