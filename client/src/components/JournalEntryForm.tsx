import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Calculator } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface LineItem {
  accountId: string;
  description: string;
  debitAmount: string;
  creditAmount: string;
}

interface JournalEntryFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export function JournalEntryForm({ onClose, onSuccess }: JournalEntryFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [description, setDescription] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { accountId: '', description: '', debitAmount: '', creditAmount: '' },
    { accountId: '', description: '', debitAmount: '', creditAmount: '' }
  ]);

  // Fetch chart of accounts
  const { data: accounts } = useQuery({
    queryKey: ['/api/accounting/chart-of-accounts'],
    enabled: true
  });

  const createJournalEntry = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest('/api/accounting/journal-entries', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Journal entry created successfully"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/accounting/journal-entries'] });
      onSuccess();
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create journal entry",
        variant: "destructive"
      });
    }
  });

  const addLineItem = () => {
    setLineItems([...lineItems, { accountId: '', description: '', debitAmount: '', creditAmount: '' }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 2) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string) => {
    const updated = lineItems.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    );
    setLineItems(updated);
  };

  const calculateTotals = () => {
    const totalDebits = lineItems.reduce((sum, item) => sum + (parseFloat(item.debitAmount) || 0), 0);
    const totalCredits = lineItems.reduce((sum, item) => sum + (parseFloat(item.creditAmount) || 0), 0);
    return { totalDebits, totalCredits, isBalanced: Math.abs(totalDebits - totalCredits) < 0.01 };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const { isBalanced } = calculateTotals();
    if (!isBalanced) {
      toast({
        title: "Error",
        description: "Journal entry must be balanced (debits must equal credits)",
        variant: "destructive"
      });
      return;
    }

    const validLineItems = lineItems.filter(item => 
      item.accountId && item.description && (parseFloat(item.debitAmount) > 0 || parseFloat(item.creditAmount) > 0)
    );

    if (validLineItems.length < 2) {
      toast({
        title: "Error",
        description: "At least two line items are required",
        variant: "destructive"
      });
      return;
    }

    createJournalEntry.mutate({
      description,
      referenceNumber,
      lineItems: validLineItems.map(item => ({
        accountId: parseInt(item.accountId),
        description: item.description,
        debitAmount: parseFloat(item.debitAmount) || 0,
        creditAmount: parseFloat(item.creditAmount) || 0
      }))
    });
  };

  const { totalDebits, totalCredits, isBalanced } = calculateTotals();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>New Journal Entry</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter journal entry description"
                  required
                />
              </div>
              <div>
                <Label htmlFor="referenceNumber">Reference Number</Label>
                <Input
                  id="referenceNumber"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder="Optional reference number"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Line Items</h3>
                <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Line
                </Button>
              </div>

              <div className="space-y-3">
                {lineItems.map((item, index) => (
                  <Card key={index} className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                      <div className="md:col-span-2">
                        <Label>Account</Label>
                        <Select value={item.accountId} onValueChange={(value) => updateLineItem(index, 'accountId', value)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select account" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts?.map((account: any) => (
                              <SelectItem key={account.id} value={account.id.toString()}>
                                {account.accountCode} - {account.accountName}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="md:col-span-2">
                        <Label>Description</Label>
                        <Input
                          value={item.description}
                          onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                          placeholder="Line item description"
                        />
                      </div>
                      <div>
                        <Label>Debit</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={item.debitAmount}
                          onChange={(e) => updateLineItem(index, 'debitAmount', e.target.value)}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label>Credit</Label>
                        <div className="flex gap-2">
                          <Input
                            type="number"
                            step="0.01"
                            value={item.creditAmount}
                            onChange={(e) => updateLineItem(index, 'creditAmount', e.target.value)}
                            placeholder="0.00"
                          />
                          {lineItems.length > 2 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeLineItem(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Calculator className="h-5 w-5" />
                  <span className="font-medium">Totals:</span>
                  <span>Debits: ${totalDebits.toFixed(2)}</span>
                  <span>Credits: ${totalCredits.toFixed(2)}</span>
                </div>
                <Badge variant={isBalanced ? "default" : "destructive"}>
                  {isBalanced ? "Balanced" : "Out of Balance"}
                </Badge>
              </div>
            </Card>

            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={!isBalanced || createJournalEntry.isPending}
              >
                {createJournalEntry.isPending ? "Creating..." : "Create Entry"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}