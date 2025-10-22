import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import Icon from '@/components/ui/icon';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type Priority = 'high' | 'medium' | 'low';
type Task = {
  id: string | number;
  title: string;
  description: string;
  completed: boolean;
  priority: Priority;
  tags: string[];
  category: string;
  dueDate?: Date;
  project: string;
};

const API_URL = 'https://functions.poehali.dev/37060a48-8c02-4a5b-83a8-a95973964e04';

const Index = () => {
  const [activeTab, setActiveTab] = useState('tasks');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      const loadedTasks = data.tasks.map((task: any) => ({
        id: task.id,
        title: task.title,
        description: task.description || '',
        completed: task.completed,
        priority: task.priority,
        tags: task.tags || [],
        category: task.category || 'Без категории',
        project: task.project || 'Без проекта',
        dueDate: task.due_date ? new Date(task.due_date) : undefined,
      }));
      setTasks(loadedTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '',
    description: '',
    priority: 'medium',
    tags: [],
    category: '',
    project: '',
  });

  const allTags = Array.from(new Set(tasks.flatMap((t) => t.tags)));
  const allCategories = Array.from(new Set(tasks.map((t) => t.category)));
  const allProjects = Array.from(new Set(tasks.map((t) => t.project)));

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTags =
      selectedTags.length === 0 || selectedTags.some((tag) => task.tags.includes(tag));
    const matchesCategory =
      selectedCategory === 'all' || task.category === selectedCategory;
    return matchesSearch && matchesTags && matchesCategory;
  });

  const toggleTask = async (id: string | number) => {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    try {
      const response = await fetch(API_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          title: task.title,
          description: task.description,
          completed: !task.completed,
          priority: task.priority,
          tags: task.tags,
          category: task.category,
          project: task.project,
          due_date: task.dueDate?.toISOString(),
        }),
      });

      if (response.ok) {
        setTasks(tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
      }
    } catch (error) {
      console.error('Error toggling task:', error);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const addTask = async () => {
    if (!newTask.title) return;

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTask.title,
          description: newTask.description || '',
          priority: newTask.priority || 'medium',
          tags: newTask.tags || [],
          category: newTask.category || 'Без категории',
          project: newTask.project || 'Без проекта',
          due_date: newTask.dueDate?.toISOString(),
        }),
      });

      if (response.ok) {
        await loadTasks();
        setNewTask({
          title: '',
          description: '',
          priority: 'medium',
          tags: [],
          category: '',
          project: '',
        });
        setIsDialogOpen(false);
      }
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const updateTask = async () => {
    if (!editingTask || !editingTask.title) return;

    try {
      const response = await fetch(API_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTask.id,
          title: editingTask.title,
          description: editingTask.description,
          completed: editingTask.completed,
          priority: editingTask.priority,
          tags: editingTask.tags,
          category: editingTask.category,
          project: editingTask.project,
          due_date: editingTask.dueDate?.toISOString(),
        }),
      });

      if (response.ok) {
        await loadTasks();
        setEditingTask(null);
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const deleteTask = async (id: string | number) => {
    try {
      const response = await fetch(`${API_URL}?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadTasks();
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const stats = {
    total: tasks.length,
    completed: tasks.filter((t) => t.completed).length,
    active: tasks.filter((t) => !t.completed).length,
    highPriority: tasks.filter((t) => t.priority === 'high' && !t.completed).length,
  };

  const priorityColor = {
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    low: 'bg-slate-100 text-slate-600 border-slate-200',
  };

  const priorityLabel = {
    high: 'Высокий',
    medium: 'Средний',
    low: 'Низкий',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold text-slate-800 mb-2">Task Tracker</h1>
          <p className="text-slate-600">Управляйте задачами эффективно</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white shadow-sm border border-slate-200 p-1">
            <TabsTrigger value="tasks" className="gap-2">
              <Icon name="CheckSquare" size={18} />
              Задачи
            </TabsTrigger>
            <TabsTrigger value="tags" className="gap-2">
              <Icon name="Tags" size={18} />
              Теги
            </TabsTrigger>
            <TabsTrigger value="projects" className="gap-2">
              <Icon name="Folder" size={18} />
              Проекты
            </TabsTrigger>
            <TabsTrigger value="calendar" className="gap-2">
              <Icon name="Calendar" size={18} />
              Календарь
            </TabsTrigger>
            <TabsTrigger value="statistics" className="gap-2">
              <Icon name="BarChart3" size={18} />
              Статистика
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="gap-2">
              <Icon name="LayoutDashboard" size={18} />
              Дашборд
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tasks" className="space-y-6 animate-fade-in">
            <div className="flex gap-4 flex-wrap items-center">
              <div className="flex-1 min-w-[300px]">
                <div className="relative">
                  <Icon
                    name="Search"
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <Input
                    placeholder="Поиск задач..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white border-slate-200"
                  />
                </div>
              </div>

              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[200px] bg-white border-slate-200">
                  <SelectValue placeholder="Категория" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все категории</SelectItem>
                  {allCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                    <Icon name="Plus" size={18} />
                    Новая задача
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Создать задачу</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Название</Label>
                      <Input
                        id="title"
                        placeholder="Введите название задачи"
                        value={newTask.title}
                        onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Описание</Label>
                      <Textarea
                        id="description"
                        placeholder="Добавьте описание..."
                        value={newTask.description}
                        onChange={(e) =>
                          setNewTask({ ...newTask, description: e.target.value })
                        }
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Приоритет</Label>
                        <Select
                          value={newTask.priority}
                          onValueChange={(value: Priority) =>
                            setNewTask({ ...newTask, priority: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="high">Высокий</SelectItem>
                            <SelectItem value="medium">Средний</SelectItem>
                            <SelectItem value="low">Низкий</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Срок</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full justify-start text-left font-normal',
                                !newTask.dueDate && 'text-muted-foreground'
                              )}
                            >
                              <Icon name="CalendarIcon" size={16} className="mr-2" />
                              {newTask.dueDate ? (
                                format(newTask.dueDate, 'PPP', { locale: ru })
                              ) : (
                                <span>Выберите дату</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={newTask.dueDate}
                              onSelect={(date) => setNewTask({ ...newTask, dueDate: date })}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="category">Категория</Label>
                      <Input
                        id="category"
                        placeholder="Разработка, Дизайн..."
                        value={newTask.category}
                        onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="project">Проект</Label>
                      <Input
                        id="project"
                        placeholder="Название проекта"
                        value={newTask.project}
                        onChange={(e) => setNewTask({ ...newTask, project: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tags">Теги (через запятую)</Label>
                      <Input
                        id="tags"
                        placeholder="frontend, api, urgent"
                        onChange={(e) =>
                          setNewTask({
                            ...newTask,
                            tags: e.target.value.split(',').map((t) => t.trim()),
                          })
                        }
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Отмена
                    </Button>
                    <Button onClick={addTask} className="bg-blue-600 hover:bg-blue-700">
                      Создать
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={!!editingTask} onOpenChange={(open) => !open && setEditingTask(null)}>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Редактировать задачу</DialogTitle>
                  </DialogHeader>
                  {editingTask && (
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-title">Название</Label>
                        <Input
                          id="edit-title"
                          value={editingTask.title}
                          onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-description">Описание</Label>
                        <Textarea
                          id="edit-description"
                          value={editingTask.description}
                          onChange={(e) =>
                            setEditingTask({ ...editingTask, description: e.target.value })
                          }
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Приоритет</Label>
                          <Select
                            value={editingTask.priority}
                            onValueChange={(value: Priority) =>
                              setEditingTask({ ...editingTask, priority: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="high">Высокий</SelectItem>
                              <SelectItem value="medium">Средний</SelectItem>
                              <SelectItem value="low">Низкий</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Срок</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  'w-full justify-start text-left font-normal',
                                  !editingTask.dueDate && 'text-muted-foreground'
                                )}
                              >
                                <Icon name="CalendarIcon" size={16} className="mr-2" />
                                {editingTask.dueDate ? (
                                  format(editingTask.dueDate, 'PPP', { locale: ru })
                                ) : (
                                  <span>Выберите дату</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={editingTask.dueDate}
                                onSelect={(date) => setEditingTask({ ...editingTask, dueDate: date })}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-category">Категория</Label>
                        <Input
                          id="edit-category"
                          value={editingTask.category}
                          onChange={(e) => setEditingTask({ ...editingTask, category: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-project">Проект</Label>
                        <Input
                          id="edit-project"
                          value={editingTask.project}
                          onChange={(e) => setEditingTask({ ...editingTask, project: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-tags">Теги (через запятую)</Label>
                        <Input
                          id="edit-tags"
                          value={editingTask.tags.join(', ')}
                          onChange={(e) =>
                            setEditingTask({
                              ...editingTask,
                              tags: e.target.value.split(',').map((t) => t.trim()).filter(t => t),
                            })
                          }
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setEditingTask(null)}>
                      Отмена
                    </Button>
                    <Button onClick={updateTask} className="bg-blue-600 hover:bg-blue-700">
                      Сохранить
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="flex gap-2 flex-wrap">
              {allTags.map((tag) => (
                <Badge
                  key={tag}
                  variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                  className={cn(
                    'cursor-pointer transition-all hover:scale-105',
                    selectedTags.includes(tag) && 'bg-blue-600'
                  )}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>

            <div className="space-y-3">
              {filteredTasks.map((task) => (
                <Card
                  key={task.id}
                  className={cn(
                    'p-5 border-2 transition-all hover:shadow-md animate-scale-in',
                    task.completed && 'opacity-60 bg-slate-50'
                  )}
                >
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={() => toggleTask(task.id)}
                      className="mt-1"
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h3
                            className={cn(
                              'font-semibold text-lg text-slate-800',
                              task.completed && 'line-through text-slate-500'
                            )}
                          >
                            {task.title}
                          </h3>
                          {task.description && (
                            <p className="text-slate-600 text-sm mt-1">
                              {task.description}
                            </p>
                          )}
                        </div>
                        <Badge
                          variant="outline"
                          className={cn('shrink-0', priorityColor[task.priority])}
                        >
                          {priorityLabel[task.priority]}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 items-center text-sm text-slate-600">
                        <div className="flex items-center gap-1">
                          <Icon name="Folder" size={14} />
                          {task.project}
                        </div>
                        <span className="text-slate-300">•</span>
                        <div className="flex items-center gap-1">
                          <Icon name="Tag" size={14} />
                          {task.category}
                        </div>
                        {task.dueDate && (
                          <>
                            <span className="text-slate-300">•</span>
                            <div className="flex items-center gap-1">
                              <Icon name="Calendar" size={14} />
                              {format(task.dueDate, 'd MMM', { locale: ru })}
                            </div>
                          </>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {task.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-xs bg-blue-50 text-blue-700 border-blue-200"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingTask(task)}
                        className="gap-1"
                      >
                        <Icon name="Edit" size={14} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteTask(task.id)}
                        className="gap-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Icon name="Trash2" size={14} />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="tags" className="animate-fade-in">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800">Управление тегами</h2>
                <p className="text-slate-600">Всего тегов: {allTags.length}</p>
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allTags.map((tag) => {
                  const tagTasks = tasks.filter((t) => t.tags.includes(tag));
                  const completed = tagTasks.filter((t) => t.completed).length;
                  
                  return (
                    <Card key={tag} className="p-5 border-2 hover:shadow-lg transition-all">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Icon name="Tag" size={20} className="text-blue-600" />
                            <h3 className="font-semibold text-lg text-slate-800">{tag}</h3>
                          </div>
                          <p className="text-sm text-slate-600 mb-3">
                            {tagTasks.length} {tagTasks.length === 1 ? 'задача' : 'задач'}
                          </p>
                          <div className="space-y-1 text-xs text-slate-500">
                            <div>Завершено: {completed}</div>
                            <div>В работе: {tagTasks.length - completed}</div>
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                          {tagTasks.length}
                        </Badge>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <div className="flex gap-2 text-xs">
                          {tagTasks.slice(0, 3).map((t) => (
                            <Badge key={t.id} variant="outline" className="text-xs">
                              {t.title.length > 15 ? t.title.slice(0, 15) + '...' : t.title}
                            </Badge>
                          ))}
                          {tagTasks.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{tagTasks.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
              
              {allTags.length === 0 && (
                <div className="text-center py-12">
                  <Icon name="Tags" size={48} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-600">Пока нет тегов. Добавьте теги к задачам!</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="projects" className="animate-fade-in">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-slate-800">Управление проектами</h2>
                <p className="text-slate-600">Всего проектов: {allProjects.length}</p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allProjects.map((project) => {
                  const projectTasks = tasks.filter((t) => t.project === project);
                  const completed = projectTasks.filter((t) => t.completed).length;
                  const progress = (completed / projectTasks.length) * 100;
                  const highPriorityTasks = projectTasks.filter(
                    (t) => t.priority === 'high' && !t.completed
                  ).length;

                  return (
                    <Card key={project} className="p-6 border-2 hover:shadow-lg transition-all">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Icon name="Folder" size={20} className="text-blue-600" />
                            <h3 className="font-semibold text-lg text-slate-800">{project}</h3>
                          </div>
                          <p className="text-sm text-slate-600">
                            {projectTasks.length} {projectTasks.length === 1 ? 'задача' : 'задач'}
                          </p>
                        </div>
                        {highPriorityTasks > 0 && (
                          <Badge variant="destructive" className="bg-red-100 text-red-700">
                            {highPriorityTasks} срочных
                          </Badge>
                        )}
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Прогресс</span>
                          <span className="font-semibold text-slate-800">
                            {completed}/{projectTasks.length}
                          </span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      <div className="pt-4 border-t border-slate-200">
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Завершено:</span>
                            <span className="font-medium text-green-600">{completed}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">В работе:</span>
                            <span className="font-medium text-blue-600">
                              {projectTasks.length - completed}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-1">
                        {Array.from(new Set(projectTasks.flatMap((t) => t.tags)))
                          .slice(0, 3)
                          .map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                      </div>
                    </Card>
                  );
                })}
              </div>

              {allProjects.length === 0 && (
                <div className="text-center py-12">
                  <Icon name="Folder" size={48} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-600">Пока нет проектов. Создайте первую задачу!</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="calendar" className="animate-fade-in">
            <Card className="p-8 border-2">
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  className="rounded-md border"
                  modifiers={{
                    hasTask: tasks
                      .filter((t) => t.dueDate)
                      .map((t) => t.dueDate as Date),
                  }}
                  modifiersStyles={{
                    hasTask: {
                      fontWeight: 'bold',
                      backgroundColor: '#2563eb',
                      color: 'white',
                    },
                  }}
                />
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="statistics" className="space-y-6 animate-fade-in">
            <div className="grid md:grid-cols-4 gap-4">
              <Card className="p-6 border-2 bg-gradient-to-br from-blue-50 to-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Всего задач</p>
                    <p className="text-3xl font-bold text-slate-800">{stats.total}</p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-xl">
                    <Icon name="ListTodo" size={24} className="text-blue-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6 border-2 bg-gradient-to-br from-green-50 to-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Завершено</p>
                    <p className="text-3xl font-bold text-slate-800">{stats.completed}</p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-xl">
                    <Icon name="CheckCircle2" size={24} className="text-green-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6 border-2 bg-gradient-to-br from-amber-50 to-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">В работе</p>
                    <p className="text-3xl font-bold text-slate-800">{stats.active}</p>
                  </div>
                  <div className="bg-amber-100 p-3 rounded-xl">
                    <Icon name="Clock" size={24} className="text-amber-600" />
                  </div>
                </div>
              </Card>

              <Card className="p-6 border-2 bg-gradient-to-br from-red-50 to-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Высокий приоритет</p>
                    <p className="text-3xl font-bold text-slate-800">{stats.highPriority}</p>
                  </div>
                  <div className="bg-red-100 p-3 rounded-xl">
                    <Icon name="AlertCircle" size={24} className="text-red-600" />
                  </div>
                </div>
              </Card>
            </div>

            <Card className="p-6 border-2">
              <h3 className="font-semibold text-lg mb-4 text-slate-800">
                Распределение по категориям
              </h3>
              <div className="space-y-3">
                {allCategories.map((category) => {
                  const count = tasks.filter((t) => t.category === category).length;
                  const percentage = (count / tasks.length) * 100;

                  return (
                    <div key={category}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-700">{category}</span>
                        <span className="font-semibold text-slate-800">{count} задач</span>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="dashboard" className="space-y-6 animate-fade-in">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="p-6 border-2">
                <h3 className="font-semibold text-lg mb-4 text-slate-800">
                  Актуальные задачи
                </h3>
                <div className="space-y-3">
                  {tasks
                    .filter((t) => !t.completed)
                    .slice(0, 5)
                    .map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-slate-800">{task.title}</p>
                          <p className="text-xs text-slate-600 mt-1">{task.project}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={cn('ml-2', priorityColor[task.priority])}
                        >
                          {priorityLabel[task.priority]}
                        </Badge>
                      </div>
                    ))}
                </div>
              </Card>

              <Card className="p-6 border-2">
                <h3 className="font-semibold text-lg mb-4 text-slate-800">
                  Популярные теги
                </h3>
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => {
                    const count = tasks.filter((t) => t.tags.includes(tag)).length;
                    return (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="px-4 py-2 text-sm bg-blue-50 text-blue-700 border-blue-200"
                      >
                        {tag} ({count})
                      </Badge>
                    );
                  })}
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;