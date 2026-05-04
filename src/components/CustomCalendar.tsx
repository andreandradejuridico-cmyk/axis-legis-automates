import React, { useState, useEffect } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek, isToday, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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

import { supabase } from '@/integrations/supabase/client';

type Appointment = {
  id: string;
  contact_name: string;
  legal_area: string;
  appointment_time: string;
};

export const CustomCalendar = ({ appointments = [] }: { appointments?: Appointment[] }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [localHolidays, setLocalHolidays] = useState<Holiday[]>([]);
  const [loadingHolidays, setLoadingHolidays] = useState(false);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear().toString());

  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isManagingEvent, setIsManagingEvent] = useState(false);
  const [isCreatingApp, setIsCreatingApp] = useState(false);
  const [isAddingHoliday, setIsAddingHoliday] = useState(false);

  // Holiday Form State
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayType, setNewHolidayType] = useState('municipal');

  // Form State for Manual Appointment
  const [formData, setFormData] = useState({
    contact_name: '',
    contact_phone: '',
    contact_email: '',
    appointment_time: '',
    legal_area: '',
    subject: ''
  });

  const events: Event[] = appointments.map(app => ({
    id: app.id,
    title: `${app.contact_name} - ${app.legal_area}`,
    date: parseISO(app.appointment_time),
    type: 'appointment',
    description: `Cliente: ${app.contact_name}\nAssunto: ${app.legal_area}\nTel: ${app.contact_phone || 'N/A'}`
  }));

  const handleCreateApp = async () => {
    if (!formData.contact_name || !formData.appointment_time) return toast.error("Nome e Horário são obrigatórios.");
    
    const { error } = await supabase.from('appointments').insert({
      ...formData,
      status: 'pending'
    });

    if (error) {
      toast.error("Erro ao criar agendamento.");
    } else {
      toast.success("Agendamento criado com sucesso!");
      setIsCreatingApp(false);
      setFormData({ contact_name: '', contact_phone: '', contact_email: '', appointment_time: '', legal_area: '', subject: '' });
      window.location.reload(); // Refresh to get new list from Admin parent
    }
  };

  const handleDeleteApp = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este agendamento?")) return;
    
    const { error } = await supabase.from('appointments').delete().eq('id', id);
    if (error) {
      toast.error("Erro ao excluir.");
    } else {
      toast.success("Excluído com sucesso.");
      setIsManagingEvent(false);
      window.location.reload();
    }
  };

  const fetchHolidays = async (year: string) => {
    setLoadingHolidays(true);
    try {
      // 1. National Holidays
      const response = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`);
      let natHols = [];
      if (response.ok) {
        natHols = await response.json();
      }

      // 2. Local Holidays (State/Municipal) from Supabase
      const { data: localData } = await supabase
        .from('local_holidays')
        .select('*')
        .gte('holiday_date', `${year}-01-01`)
        .lte('holiday_date', `${year}-12-31`);

      setHolidays(natHols.map((h: any) => ({ ...h, type: 'nacional' })));
      
      if (localData) {
        setLocalHolidays(localData.map(h => ({
          date: h.holiday_date,
          name: h.name,
          type: h.type
        })));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingHolidays(false);
    }
  };

  const addLocalHoliday = async () => {
    if (!newHolidayName || !newHolidayDate) return toast.error("Preencha nome e data.");
    
    const { error } = await supabase.from('local_holidays').insert({
      name: newHolidayName,
      holiday_date: newHolidayDate,
      type: newHolidayType
    });

    if (error) {
      toast.error("Erro ao adicionar feriado local.");
    } else {
      toast.success("Feriado adicionado!");
      setNewHolidayName('');
      setNewHolidayDate('');
      setIsAddingHoliday(false);
      fetchHolidays(selectedYear); // Refresh
    }
  };

  useEffect(() => {
    fetchHolidays(selectedYear);
  }, [selectedYear]);

  // Combine events, national holidays, and local holidays
  const allEvents: Event[] = [
    ...events,
    ...holidays.map(h => ({
      id: `hol-${h.date}`,
      title: h.name,
      date: parseISO(h.date),
      type: 'holiday' as const,
      description: `Feriado ${h.type}`
    })),
    ...localHolidays.map(h => ({
      id: `lhol-${h.date}-${h.name}`,
      title: h.name,
      date: parseISO(h.date),
      type: 'custom' as const,
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
            <Dialog open={isCreatingApp} onOpenChange={setIsCreatingApp}>
              <DialogTrigger asChild>
                <Button className="bg-bronze hover:bg-bronze-dark text-white shadow-md">
                  + Novo Agendamento
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card text-foreground">
                <DialogHeader><DialogTitle>Agendamento Manual</DialogTitle></DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Nome do Cliente</Label>
                    <Input value={formData.contact_name} onChange={e => setFormData({...formData, contact_name: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Telefone</Label>
                      <Input value={formData.contact_phone} onChange={e => setFormData({...formData, contact_phone: e.target.value})} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Horário</Label>
                      <Input type="datetime-local" value={formData.appointment_time} onChange={e => setFormData({...formData, appointment_time: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Área Jurídica</Label>
                    <Input value={formData.legal_area} onChange={e => setFormData({...formData, legal_area: e.target.value})} />
                  </div>
                  <Button onClick={handleCreateApp} className="bg-navy text-white">Salvar Agendamento</Button>
                </div>
              </DialogContent>
            </Dialog>

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
            
            <Dialog open={isAddingHoliday} onOpenChange={setIsAddingHoliday}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="bg-white/10 text-white border-white/20 hover:bg-white/20">
                  + Feriado Local
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card text-foreground border-border sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Adicionar Feriado Local/Estadual</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Nome do Feriado</Label>
                    <Input value={newHolidayName} onChange={e => setNewHolidayName(e.target.value)} placeholder="Ex: Aniversário da Cidade" />
                  </div>
                  <div className="space-y-2">
                    <Label>Data</Label>
                    <Input type="date" value={newHolidayDate} onChange={e => setNewHolidayDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={newHolidayType} onValueChange={setNewHolidayType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="estadual">Estadual</SelectItem>
                        <SelectItem value="municipal">Municipal</SelectItem>
                        <SelectItem value="custom">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={addLocalHoliday} className="w-full">Adicionar Feriado</Button>
                </div>
              </DialogContent>
            </Dialog>
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
                      onClick={() => {
                        if (event.type === 'appointment') {
                          setSelectedEvent(event);
                          setIsManagingEvent(true);
                        }
                      }}
                      className={`text-[10px] px-2 py-1 rounded truncate border font-medium flex items-center gap-1.5 cursor-pointer
                        ${event.type === 'holiday' ? 'bg-red-50 text-red-700 border-red-100' : ''}
                        ${event.type === 'appointment' ? 'bg-blue-50 text-blue-700 border-blue-100' : ''}
                        ${event.type === 'custom' ? 'bg-charcoal/5 text-charcoal border-border' : ''}
                      `}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${event.type === 'holiday' ? 'bg-red-500' : 'bg-blue-500'}`} />
                      <span className="truncate">{event.type === 'appointment' ? format(event.date, 'HH:mm') : ''} {event.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Manage Appointment Modal */}
        <Dialog open={isManagingEvent} onOpenChange={setIsManagingEvent}>
          <DialogContent className="bg-card text-foreground">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CalendarIcon className="text-bronze" /> Detalhes do Agendamento
              </DialogTitle>
            </DialogHeader>
            {selectedEvent && (
              <div className="space-y-4 py-4">
                <div className="bg-muted/20 p-4 rounded-xl border border-border">
                  <p className="text-sm font-bold text-navy">{selectedEvent.title}</p>
                  <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{selectedEvent.description}</p>
                  <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                    <p className="text-sm font-mono text-bronze">{format(selectedEvent.date, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteApp(selectedEvent.id)}>Excluir</Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
        
        <div className="mt-6 flex items-center gap-6 text-xs text-muted-foreground bg-muted/20 p-4 rounded-xl border border-border/50">
          <div className="flex items-center gap-2 font-medium">
            <Info size={14} className="text-bronze" /> Legenda:
          </div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-red-500" /> Feriados Nacionais (Brasil API)</div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-charcoal" /> Feriados Locais</div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500" /> Agendamentos IA</div>
          <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-bronze" /> Dia Atual</div>
        </div>
      </CardContent>
    </Card>
  );
};
