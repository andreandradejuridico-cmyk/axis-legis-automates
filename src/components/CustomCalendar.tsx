import React, { useState, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

type Holiday = {
  date: string;
  name: string;
  type: string;
};

type Event = {
  id: string;
  title: string;
  date: Date;
  type: 'appointment' | 'holiday' | 'custom';
  description?: string;
};

type Appointment = {
  id: string;
  contact_name: string;
  legal_area: string;
  appointment_time: string;
};

export const CustomCalendar = ({ appointments = [] }: { appointments?: Appointment[] }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loadingHolidays, setLoadingHolidays] = useState(false);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString());

  const events: Event[] = appointments.map(app => ({
    id: app.id,
    title: `${app.contact_name} - ${app.legal_area}`,
    date: parseISO(app.appointment_time),
    type: 'appointment'
  }));


  // Fetch National Holidays from Brasil API
  const fetchHolidays = async (year: string) => {
    setLoadingHolidays(true);
    try {
      const response = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`);
      if (!response.ok) throw new Error('Falha ao carregar feriados');
      const data = await response.json();
      setHolidays(data.map((h: any) => ({ ...h, type: 'nacional' })));
      toast.success(`Feriados de ${year} carregados!`);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao buscar feriados. Usando apenas agendamentos.');
    } finally {
      setLoadingHolidays(false);
    }
  };

  useEffect(() => {
    fetchHolidays(selectedYear);
  }, [selectedYear]);

  // Combine events and holidays
  const allEvents: Event[] = [
    ...events,
    ...holidays.map(h => ({
      id: `hol-${h.date}`,
      title: h.name,
      date: parseISO(h.date),
      type: 'holiday' as const,
      description: `Feriado ${h.type}`
    }))
  ];

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const dateFormat = "MMMM yyyy";
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <Card className="w-full bg-card shadow-card border-border/50 rounded-2xl overflow-hidden">
      <CardHeader className="bg-navy-gradient text-white p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
              <CalendarIcon size={24} className="text-bronze" />
            </div>
            <div>
              <CardTitle className="font-serif text-2xl font-normal tracking-wide capitalize">
                {format(currentDate, dateFormat, { locale: ptBR })}
              </CardTitle>
              <p className="text-silver text-xs font-mono tracking-widest uppercase mt-1">Agenda Inteligente</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Select value={selectedYear} onValueChange={(y) => { setSelectedYear(y); setCurrentDate(new Date(parseInt(y), currentDate.getMonth(), 1)); }}>
              <SelectTrigger className="w-[100px] bg-white/5 border-white/10 text-white focus:ring-bronze">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent className="bg-navy border-white/10 text-white">
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="2027">2027</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex gap-1 bg-white/5 p-1 rounded-lg border border-white/10">
              <Button variant="ghost" size="icon" onClick={prevMonth} className="text-white hover:bg-white/10 h-8 w-8 rounded-md">
                <ChevronLeft size={18} />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())} className="text-white hover:bg-white/10 h-8 font-medium">
                Hoje
              </Button>
              <Button variant="ghost" size="icon" onClick={nextMonth} className="text-white hover:bg-white/10 h-8 w-8 rounded-md">
                <ChevronRight size={18} />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-7 gap-px bg-border/50 rounded-xl overflow-hidden shadow-inner">
          {/* Weekday Headers */}
          {weekDays.map(day => (
            <div key={day} className="bg-muted/50 p-3 text-center text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {day}
            </div>
          ))}
          
          {/* Days Grid */}
          {days.map((day, idx) => {
            const dayEvents = allEvents.filter(e => isSameDay(e.date, day));
            const isHol = dayEvents.some(e => e.type === 'holiday');
            const isApp = dayEvents.some(e => e.type === 'appointment');
            
            return (
              <div 
                key={day.toString()} 
                className={`min-h-[100px] p-2 bg-background transition-all hover:bg-muted/30
                  ${!isSameMonth(day, monthStart) ? 'text-muted-foreground/30 bg-muted/10' : 'text-foreground'}
                  ${isToday(day) ? 'ring-2 ring-inset ring-bronze/50 bg-bronze/5' : ''}
                `}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full
                    ${isToday(day) ? 'bg-bronze text-white shadow-md' : ''}
                    ${isHol && !isToday(day) ? 'text-red-500' : ''}
                  `}>
                    {format(day, 'd')}
                  </span>
                </div>
                
                <div className="mt-2 flex flex-col gap-1">
                  {dayEvents.map(event => (
                    <div 
                      key={event.id}
                      title={event.title}
                      className={`text-[10px] px-2 py-1 rounded truncate border font-medium flex items-center gap-1.5
                        ${event.type === 'holiday' ? 'bg-red-50 text-red-700 border-red-100' : ''}
                        ${event.type === 'appointment' ? 'bg-blue-50 text-blue-700 border-blue-100' : ''}
                        ${event.type === 'custom' ? 'bg-charcoal/5 text-charcoal border-border' : ''}
                      `}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${event.type === 'holiday' ? 'bg-red-500' : 'bg-blue-500'}`} />
                      <span className="truncate">{event.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-6 flex items-center gap-6 text-xs text-muted-foreground bg-muted/20 p-4 rounded-xl border border-border/50">
          <div className="flex items-center gap-2 font-medium">
            <Info size={14} className="text-bronze" /> Legenda:
          </div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500" /> Feriados Nacionais (Brasil API)</div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500" /> Agendamentos IA</div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-bronze" /> Dia Atual</div>
        </div>
      </CardContent>
    </Card>
  );
};
