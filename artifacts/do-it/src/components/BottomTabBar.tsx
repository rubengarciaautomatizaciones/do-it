import React from 'react';
import { Link, useLocation } from 'wouter';
import { CheckSquare, CalendarDays, User } from 'lucide-react';

export function BottomTabBar() {
  const [location] = useLocation();

  const tabs = [
    { href: '/', icon: CheckSquare, label: 'Tareas' },
    { href: '/habits', icon: CalendarDays, label: 'Hábitos' },
    { href: '/calendar', icon: CalendarDays, label: 'Calendario' },
    { href: '/profile', icon: User, label: 'Perfil' },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-2 bg-white/80 backdrop-blur-md px-6 py-3 rounded-full border border-gray-100 shadow-sm">
        {tabs.map((tab) => {
          const isActive = location === tab.href;
          const Icon = tab.icon;
          return (
            <Link key={tab.href} href={tab.href}>
              <div
                className={`p-2 rounded-full transition-colors cursor-pointer flex items-center justify-center
                  ${isActive ? 'bg-black text-white' : 'text-gray-400 hover:text-black hover:bg-gray-50'}`}
              >
                <Icon strokeWidth={1.5} className="w-5 h-5" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
