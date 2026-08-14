import { ChevronDown, Languages as LanguagesIcon, LogOut, Map, Menu, Route, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { guideRepository } from '../data/repositories';
import type { GuideRoute, Language, LanguageCode } from '../domain/types';
import { defaultLanguageCode, getPersistedLanguage, persistLanguage } from '../lib/language';
import { clearParticipantTourSession, getParticipantTourSession, subscribeTourSessionChange, type ParticipantTourSession } from '../lib/tourSession';
import { exitRoute, getActiveRouteSession, subscribeRouteSessionChange, type ActiveRouteSession } from '../lib/routeSession';
import { publicPath } from '../lib/routing';
import { PublicUserMenu } from './PublicUserMenu';

interface PublicTopNavProps {
  current: LanguageCode;
  languages: Language[];
  pathForLanguage?: (code: LanguageCode) => string;
  onLanguageSelect?: (code: LanguageCode) => void;
}

export function PublicTopNav({ current, languages, pathForLanguage, onLanguageSelect }: PublicTopNavProps) {
  const navigate = useNavigate();
  const [isMobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState<string>();
  const [tourSession, setTourSession] = useState<ParticipantTourSession | undefined>(() => getParticipantTourSession());
  const [routeSession, setRouteSession] = useState<ActiveRouteSession | undefined>(() => getActiveRouteSession());
  const [routes, setRoutes] = useState<GuideRoute[]>([]);
  const language = current ?? getPersistedLanguage() ?? defaultLanguageCode;

  useEffect(() => subscribeTourSessionChange(() => setTourSession(getParticipantTourSession())), []);
  useEffect(() => subscribeRouteSessionChange(() => setRouteSession(getActiveRouteSession())), []);

  useEffect(() => {
    if (!routeSession?.routeId) {
      setRoutes([]);
      return;
    }
    guideRepository.getRoutes(language).then(setRoutes).catch(() => setRoutes([]));
  }, [language, routeSession?.routeId]);

  const activeRoute = useMemo(() => routes.find((route) => route.id === routeSession?.routeId), [routeSession?.routeId, routes]);
  const activeRouteElement = activeRoute?.elements[Math.min(routeSession?.currentIndex ?? 0, Math.max(activeRoute.elements.length - 1, 0))] ?? activeRoute?.elements[0];

  function closeMenus() {
    setOpenMenu(undefined);
    setMobileOpen(false);
  }

  function changeLanguage(code: LanguageCode) {
    persistLanguage(code);
    onLanguageSelect?.(code);
    closeMenus();
  }

  function leaveTour() {
    clearParticipantTourSession();
    closeMenus();
  }

  function leaveRoute() {
    exitRoute();
    closeMenus();
  }

  function goToActiveRoute() {
    if (activeRouteElement) {
      navigate(`/guia/${language}/elemento/${activeRouteElement.slug}`);
    } else {
      navigate(`/rutas/${language}`);
    }
    closeMenus();
  }

  return (
    <header className="public-top-nav">
      <Link className="public-top-brand" to="/preview" onClick={closeMenus}>
        <span>VIVE</span><strong>UTRERA</strong>
      </Link>
      <button
        className="public-nav-toggle"
        type="button"
        aria-label="Abrir menu"
        aria-expanded={isMobileOpen}
        onClick={() => setMobileOpen((value) => !value)}
      >
        {isMobileOpen ? <X size={22} /> : <Menu size={22} />}
      </button>
      <nav className={isMobileOpen ? 'public-nav-links open' : 'public-nav-links'} aria-label="Menu principal">
        <Link to="/preview" onClick={closeMenus}>Inicio</Link>
        <Link to={`/guia/${language}`} onClick={closeMenus}>Guia</Link>
        <div className="public-nav-item">
          <Link to={`/tours/${language}`} onClick={closeMenus}>Tours</Link>
          {tourSession ? (
            <>
              <button type="button" className="public-nav-subtoggle" aria-label="Opciones del tour" onClick={() => setOpenMenu(openMenu === 'tour' ? undefined : 'tour')}><ChevronDown size={16} /></button>
              <div className={openMenu === 'tour' ? 'public-nav-submenu open' : 'public-nav-submenu'}>
                <strong>{tourDisplayName(tourSession)}</strong>
                <button type="button" onClick={leaveTour}><LogOut size={16} /> Salir del tour</button>
              </div>
            </>
          ) : null}
        </div>
        <div className="public-nav-item">
          <Link to={`/rutas/${language}`} onClick={closeMenus}>Rutas</Link>
          {routeSession ? (
            <>
              <button type="button" className="public-nav-subtoggle" aria-label="Opciones de la ruta" onClick={() => setOpenMenu(openMenu === 'route' ? undefined : 'route')}><ChevronDown size={16} /></button>
              <div className={openMenu === 'route' ? 'public-nav-submenu open' : 'public-nav-submenu'}>
                <strong>{activeRoute?.translations[language].name ?? 'Ruta activa'}</strong>
                <button type="button" onClick={goToActiveRoute}><Route size={16} /> Ir a la ruta</button>
                <button type="button" onClick={leaveRoute}><Map size={16} /> Salir de la ruta</button>
              </div>
            </>
          ) : null}
        </div>
        <div className="public-nav-item public-nav-language-item">
          <button type="button" className="public-nav-language-button" onClick={() => setOpenMenu(openMenu === 'languages' ? undefined : 'languages')}>
            <LanguagesIcon size={17} />
            <span>Idiomas</span>
            <ChevronDown size={16} />
          </button>
          <div className={openMenu === 'languages' ? 'public-nav-submenu public-language-submenu open' : 'public-nav-submenu public-language-submenu'}>
            {languages.map((item) => (
              pathForLanguage ? (
                <Link
                  key={item.id}
                  to={pathForLanguage(item.code)}
                  aria-label={item.nativeName}
                  aria-current={item.code === language ? 'page' : undefined}
                  className={item.code === language ? 'active' : ''}
                  onClick={() => changeLanguage(item.code)}
                >
                  <img src={publicPath(`flags/flag-${item.code}.png`)} alt="" />
                </Link>
              ) : (
                <button
                  key={item.id}
                  type="button"
                  aria-label={item.nativeName}
                  aria-pressed={item.code === language}
                  className={item.code === language ? 'active' : ''}
                  onClick={() => changeLanguage(item.code)}
                >
                  <img src={publicPath(`flags/flag-${item.code}.png`)} alt="" />
                </button>
              )
            ))}
          </div>
        </div>
        <PublicUserMenu />
      </nav>
    </header>
  );
}

function tourDisplayName(session: ParticipantTourSession) {
  return session.name ? `${session.code} - ${session.name}` : session.code;
}
