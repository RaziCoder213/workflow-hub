import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { 
  Gift, 
  Plus, 
  Pencil, 
  Trash2, 
  Loader2, 
  Star,
  Trophy,
  Clock,
  Package,
  Settings
} from 'lucide-react';
import { toast } from 'sonner';

interface RewardCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  points_required: number;
  is_active: boolean;
  created_at: string;
}

interface RewardItem {
  id: string;
  name: string;
  description: string;
  category: string;
  category_id: string | null;
  image_url: string;
  is_active: boolean;
  points_cost: number;
  created_at: string;
}

interface RewardClaim {
  id: string;
  user_id: string;
  user_name: string;
  reward_id: string;
  reward_name: string;
  reward_type: string;
  claim_date: string;
}

const ICONS = [
  { value: 'gift', label: 'Gift', icon: Gift },
  { value: 'star', label: 'Star', icon: Star },
  { value: 'trophy', label: 'Trophy', icon: Trophy },
  { value: 'clock', label: 'Clock', icon: Clock },
];

export const RewardsManagement: React.FC = () => {
  const [categories, setCategories] = useState<RewardCategory[]>([]);
  const [items, setItems] = useState<RewardItem[]>([]);
  const [claims, setClaims] = useState<RewardClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Category form
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<RewardCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    icon: 'gift',
    points_required: 0,
    is_active: true,
  });

  // Item form
  const [itemOpen, setItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RewardItem | null>(null);
  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    category_id: '',
    image_url: '',
    points_cost: 0,
    is_active: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [categoriesRes, itemsRes, claimsRes] = await Promise.all([
      supabase.from('reward_categories').select('*').order('name'),
      supabase.from('reward_items').select('*').order('name'),
      supabase.from('reward_claims').select('*').order('claim_date', { ascending: false }).limit(100),
    ]);

    if (categoriesRes.data) setCategories(categoriesRes.data as RewardCategory[]);
    if (itemsRes.data) setItems(itemsRes.data as RewardItem[]);
    if (claimsRes.data) setClaims(claimsRes.data as RewardClaim[]);
    setLoading(false);
  };

  // Category handlers
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('reward_categories')
          .update(categoryForm)
          .eq('id', editingCategory.id);
        if (error) throw error;
        toast.success('Category updated');
      } else {
        const { error } = await supabase
          .from('reward_categories')
          .insert(categoryForm);
        if (error) throw error;
        toast.success('Category created');
      }

      setCategoryOpen(false);
      setEditingCategory(null);
      setCategoryForm({ name: '', description: '', icon: 'gift', points_required: 0, is_active: true });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const handleEditCategory = (cat: RewardCategory) => {
    setEditingCategory(cat);
    setCategoryForm({
      name: cat.name,
      description: cat.description || '',
      icon: cat.icon,
      points_required: cat.points_required,
      is_active: cat.is_active,
    });
    setCategoryOpen(true);
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Delete this category? Items in this category will need to be reassigned.')) return;

    const { error } = await supabase.from('reward_categories').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete category');
    } else {
      toast.success('Category deleted');
      fetchData();
    }
  };

  // Item handlers
  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const category = categories.find(c => c.id === itemForm.category_id);
      const payload = {
        ...itemForm,
        category: category?.name || 'daily_punctuality',
      };

      if (editingItem) {
        const { error } = await supabase
          .from('reward_items')
          .update(payload)
          .eq('id', editingItem.id);
        if (error) throw error;
        toast.success('Reward item updated');
      } else {
        const { error } = await supabase
          .from('reward_items')
          .insert(payload);
        if (error) throw error;
        toast.success('Reward item created');
      }

      setItemOpen(false);
      setEditingItem(null);
      setItemForm({ name: '', description: '', category_id: '', image_url: '', points_cost: 0, is_active: true });
      fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save item');
    } finally {
      setSaving(false);
    }
  };

  const handleEditItem = (item: RewardItem) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      description: item.description || '',
      category_id: item.category_id || '',
      image_url: item.image_url || '',
      points_cost: item.points_cost || 0,
      is_active: item.is_active,
    });
    setItemOpen(true);
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Delete this reward item?')) return;

    const { error } = await supabase.from('reward_items').delete().eq('id', id);
    if (error) {
      toast.error('Failed to delete item');
    } else {
      toast.success('Item deleted');
      fetchData();
    }
  };

  const toggleItemActive = async (item: RewardItem) => {
    const { error } = await supabase
      .from('reward_items')
      .update({ is_active: !item.is_active })
      .eq('id', item.id);

    if (!error) {
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_active: !i.is_active } : i));
    }
  };

  const getIconComponent = (iconName: string) => {
    const found = ICONS.find(i => i.value === iconName);
    return found ? found.icon : Gift;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Rewards Management</h1>
        <p className="text-muted-foreground">Create and manage reward categories and items</p>
      </div>

      <Tabs defaultValue="categories" className="space-y-6">
        <TabsList className="grid w-full md:w-auto grid-cols-3">
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="items">Reward Items</TabsTrigger>
          <TabsTrigger value="claims">Claim History</TabsTrigger>
        </TabsList>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Reward Categories</h2>
            <Dialog open={categoryOpen} onOpenChange={(open) => {
              setCategoryOpen(open);
              if (!open) {
                setEditingCategory(null);
                setCategoryForm({ name: '', description: '', icon: 'gift', points_required: 0, is_active: true });
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Category
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingCategory ? 'Edit Category' : 'New Category'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCategorySubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                      placeholder="e.g., Star Employee"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={categoryForm.description}
                      onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                      placeholder="How employees can earn this reward..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Icon</Label>
                      <Select
                        value={categoryForm.icon}
                        onValueChange={(v) => setCategoryForm({ ...categoryForm, icon: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ICONS.map((icon) => (
                            <SelectItem key={icon.value} value={icon.value}>
                              <div className="flex items-center gap-2">
                                <icon.icon className="w-4 h-4" />
                                {icon.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Points Required</Label>
                      <Input
                        type="number"
                        min="0"
                        value={categoryForm.points_required}
                        onChange={(e) => setCategoryForm({ ...categoryForm, points_required: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={categoryForm.is_active}
                      onCheckedChange={(v) => setCategoryForm({ ...categoryForm, is_active: v })}
                    />
                    <Label>Active</Label>
                  </div>
                  <Button type="submit" className="w-full" disabled={saving}>
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {editingCategory ? 'Update Category' : 'Create Category'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat) => {
              const IconComp = getIconComponent(cat.icon);
              return (
                <Card key={cat.id} className={!cat.is_active ? 'opacity-60' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <IconComp className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{cat.name}</CardTitle>
                          <Badge variant={cat.is_active ? 'default' : 'secondary'} className="text-xs mt-1">
                            {cat.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEditCategory(cat)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteCategory(cat.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-2">{cat.description || 'No description'}</p>
                    <div className="flex items-center gap-2 text-sm">
                      <Star className="w-4 h-4 text-yellow-500" />
                      <span>{cat.points_required} points required</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {items.filter(i => i.category_id === cat.id).length} items
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Items Tab */}
        <TabsContent value="items" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Reward Items</h2>
            <Dialog open={itemOpen} onOpenChange={(open) => {
              setItemOpen(open);
              if (!open) {
                setEditingItem(null);
                setItemForm({ name: '', description: '', category_id: '', image_url: '', points_cost: 0, is_active: true });
              }
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingItem ? 'Edit Item' : 'New Reward Item'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleItemSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={itemForm.name}
                      onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                      placeholder="e.g., $50 Gift Card"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={itemForm.description}
                      onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                      placeholder="Details about the reward..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={itemForm.category_id}
                      onValueChange={(v) => setItemForm({ ...itemForm, category_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Image URL</Label>
                    <Input
                      value={itemForm.image_url}
                      onChange={(e) => setItemForm({ ...itemForm, image_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Points Cost (for points-based rewards)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={itemForm.points_cost}
                      onChange={(e) => setItemForm({ ...itemForm, points_cost: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={itemForm.is_active}
                      onCheckedChange={(v) => setItemForm({ ...itemForm, is_active: v })}
                    />
                    <Label>Active</Label>
                  </div>
                  <Button type="submit" className="w-full" disabled={saving}>
                    {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    {editingItem ? 'Update Item' : 'Create Item'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Points Cost</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No reward items yet. Add your first item!
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="w-10 h-10 rounded object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                                <Package className="w-5 h-5 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{item.name}</p>
                              {item.description && (
                                <p className="text-xs text-muted-foreground truncate max-w-[200px]">{item.description}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{item.category}</Badge>
                        </TableCell>
                        <TableCell>
                          {item.points_cost > 0 ? `${item.points_cost} pts` : 'Free'}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={item.is_active}
                            onCheckedChange={() => toggleItemActive(item)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleEditItem(item)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Claims Tab */}
        <TabsContent value="claims" className="space-y-4">
          <h2 className="text-lg font-semibold">Recent Claims</h2>
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Reward</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {claims.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No claims yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    claims.map((claim) => (
                      <TableRow key={claim.id}>
                        <TableCell className="font-medium">{claim.user_name}</TableCell>
                        <TableCell>{claim.reward_name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{claim.reward_type}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(claim.claim_date).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RewardsManagement;
