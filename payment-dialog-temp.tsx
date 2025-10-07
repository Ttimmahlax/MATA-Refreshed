import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CreditCard, Eye, EyeOff, Trash2 } from "lucide-react";
import { PaymentCardFormData, PaymentCardInfo } from "@/lib/paymentModel";
import { vaultService } from "@/lib/vaultService";
import { getUserKeys, isValidUserKeys } from "@/lib/crypto";

// Card validation schema
const cardSchema = z.object({
  cardholderName: z.string().min(2, "Cardholder name is required"),
  cardNumber: z.string()
    .min(13, "Card number must be at least 13 digits")
    .max(19, "Card number must be at most 19 digits")
    .regex(/^[0-9]+$/, "Card number must contain only digits"),
  cardType: z.string().min(1, "Please select a card type"),
  expiryMonth: z.string().min(1, "Month is required"),
  expiryYear: z.string().min(4, "Year is required"),
  securityCode: z.string()
    .min(3, "Security code must be at least 3 digits")
    .max(4, "Security code must be at most 4 digits")
    .regex(/^[0-9]+$/, "Security code must contain only digits"),
  saveAddress: z.boolean().default(false),
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
}).refine(data => {
  // Only validate address fields if saving address
  if (data.saveAddress) {
    return !!data.street && !!data.city && !!data.state && !!data.zipCode && !!data.country;
  }
  return true;
}, {
  message: "Please fill in all address fields",
  path: ["street"],
});

// Card type options
const cardTypes = [
  { value: "visa", label: "Visa" },
  { value: "mastercard", label: "MasterCard" },
  { value: "amex", label: "American Express" },
  { value: "discover", label: "Discover" },
  { value: "jcb", label: "JCB" },
  { value: "unionpay", label: "UnionPay" },
  { value: "diners", label: "Diners Club" },
];

// Month options
const months = [
  "01", "02", "03", "04", "05", "06", 
  "07", "08", "09", "10", "11", "12"
];

// Generate year options (current year + 15 years)
const currentYear = new Date().getFullYear();
const years = Array.from({ length: 16 }, (_, i) => (currentYear + i).toString());

// Component to manage payment methods
export function PaymentDialog({ open, setOpen }: { open: boolean, setOpen: (open: boolean) => void }) {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentCards, setPaymentCards] = useState<PaymentCardInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddCardForm, setShowAddCardForm] = useState(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

  // Initialize the form
  const form = useForm<PaymentCardFormData>({
    resolver: zodResolver(cardSchema),
    defaultValues: {
      cardholderName: "",
      cardNumber: "",
      cardType: "",
      expiryMonth: "",
      expiryYear: "",
      securityCode: "",
      saveAddress: false,
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
    },
  });
  
  // Scroll to billing address section when it appears
  const saveAddress = form.watch("saveAddress");
  useEffect(() => {
    if (saveAddress) {
      setTimeout(() => {
        const billingSection = document.getElementById("billing-address-section");
        if (billingSection) {
          billingSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }, 100); // Small delay to ensure the section is rendered
    }
  }, [saveAddress]);

  // Load saved payment cards when the dialog opens
  useEffect(() => {
    if (open) {
      loadSavedCards();
    }
  }, [open]);

  // State for password modal
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordInputValue, setPasswordInputValue] = useState("");
  const [passwordModalError, setPasswordModalError] = useState("");
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [unlockResolve, setUnlockResolve] = useState<((value: boolean) => void) | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // Common function to unlock the vault with an integrated password dialog
  // Helper function to ensure the payment vault exists and create it if needed
  async function createPaymentVaultIfNeeded(): Promise<void> {
    try {
      // Get the user's email from localStorage for cross-session persistence
      const sessionEmail = localStorage.getItem('session_email') || 
                         localStorage.getItem('current_user_email');
      
      if (!sessionEmail) {
        console.error("No user email found in storage - cannot access payment vault");
        return;
      }
      
      // Set user-specific context to ensure correct encryption methods are used
      console.log(`Setting payment vault context for user: ${sessionEmail}`);
      localStorage.setItem('current_vault_context', sessionEmail);
      
      // ENHANCED ENCRYPTION METHOD DETERMINATION
      // First check for vault-specific method from localStorage
      let currentEncryptionMethod = localStorage.getItem(`vault_user_${sessionEmail.replace(/[@.]/g, '_')}_payments_encryption_method`);
      
      // Then check other places in order of precedence
      if (!currentEncryptionMethod) {
        currentEncryptionMethod = localStorage.getItem('current_encryption_method');
      }
      
      if (!currentEncryptionMethod) {
        currentEncryptionMethod = localStorage.getItem('user_encryption_method');
      }
      
      if (!currentEncryptionMethod) {
        // Try user-specific encryption preference from local storage
        const userKey = `encryption_pref_${sessionEmail.replace(/[@.]/g, '_')}`;
        currentEncryptionMethod = localStorage.getItem(userKey);
      }
      
      // If still no method, check general defaults
      if (!currentEncryptionMethod) {
        currentEncryptionMethod = localStorage.getItem('default_encryption_method');
      }
      
      // Last resort - default to consistent fallback
      if (!currentEncryptionMethod) {
        // Default to WebCrypto for better compatibility
        currentEncryptionMethod = 'webcrypto';
        console.log(`No encryption method found, defaulting to: ${currentEncryptionMethod}`);
      } else {
        console.log(`Found encryption method for vault: ${currentEncryptionMethod}`);
      }
      
      // Store encryption method in all relevant places for consistency
      const userKey = `encryption_pref_${sessionEmail.replace(/[@.]/g, '_')}`;
      localStorage.setItem(userKey, currentEncryptionMethod);
      localStorage.setItem('current_encryption_method', currentEncryptionMethod);
      localStorage.setItem('user_encryption_method', currentEncryptionMethod);
      localStorage.setItem('encryption_method_in_use', currentEncryptionMethod);
      
      // Vault-specific marker for future reference
      const vaultPrefix = `user_${sessionEmail.replace(/[@.]/g, '_')}_payments`;
      localStorage.setItem(`vault_${vaultPrefix}_encryption_method`, currentEncryptionMethod);
      
      console.log(`Applied consistent encryption method: ${currentEncryptionMethod}`);
      
      // Reset any existing state
      import('@/lib/crypto').then(crypto => {
        crypto.resetFallbackState();
        
        // Apply encryption method
        if (currentEncryptionMethod === 'webcrypto') {
          // Mark using WebCrypto for consistent encryption/decryption
          crypto.markUsingFallback('encrypt');
          crypto.markUsingFallback('decrypt');
          console.log("Using WebCrypto for payment vault encryption/decryption");
        } else {
          console.log("Using WASM for payment vault encryption/decryption");
        }
      });
      
      // Get all available vaults
      const vaults = await vaultService.getVaults();
      console.log("Available vaults:", vaults.map(v => ({ id: v.id, type: v.type })));
      
      // Normalize user email and create consistent payment vault ID format
      const normalizedEmail = sessionEmail.toLowerCase();
      // Use the standardized vault naming format: user_[email]_[type]
      const sanitizedEmail = normalizedEmail.replace(/[@.]/g, '_');
      const customVaultId = `user_${sanitizedEmail}_payments`;
      
      console.log("Looking for payment vault with namespace:", customVaultId);
      
      // Find the user-specific payment vault (check both new and legacy formats)
      const paymentVault = vaults.find(vault => 
        vault.id === customVaultId || 
        vault.id === `payments-${normalizedEmail}` || 
        (vault.type === 'payments' && vault.id.includes(normalizedEmail))
      );
      
      if (!paymentVault) {
        console.log("Payment vault not found, creating a new one with ID:", customVaultId);
        
        // Create the user-specific payments vault
        const newVault = await vaultService.createNewVault(
          "Payment Information", 
          "payments" as any,
          customVaultId
        );
        
        // Store the namespace for future reference and cross-session persistence
        localStorage.setItem('user_vault_namespace', customVaultId);
        localStorage.setItem('last_vault_namespace', customVaultId);
        console.log("Created user-specific payment vault:", customVaultId);
      } else {
        console.log("Payment vault found:", paymentVault.id);
        localStorage.setItem('user_vault_namespace', paymentVault.id);
      }
    } catch (error) {
      console.error("Error creating/checking payment vault:", error);
    }
  }
  
  async function tryUnlockVault(): Promise<boolean> {
    // Get user email from localStorage for cross-session persistence
    const currentEmail = localStorage.getItem('session_email');
    console.log(`Payment dialog - trying with session email: ${currentEmail || "not set"}`);
    
    // Always set vault markers in localStorage to ensure vault access UI flow works
    // This is critical for payment card operations and for cross-session persistence
    localStorage.setItem('vault_unlocked', 'true');
    localStorage.setItem('vault_unlocked_at', Date.now().toString());
    console.log("Set vault markers for payment vault access");
    
    if (vaultService.isUnlocked()) {
      console.log("Vault is already unlocked - proceeding with payment operations");
      return true;
    }
    
    try {
      // Initialize the vault service if needed
      if (!vaultService.isInitialized()) {
        await vaultService.initialize();
      }
      
      // Try to unlock the vault without a password (will use stored credentials if available)
      const unlocked = await vaultService.unlockVault();
      console.log("Vault unlock attempt result:", unlocked);
      return unlocked;
    } catch (error) {
      console.error("Error unlocking vault:", error);
      return false;
    }
    
    // If auto-unlock fails, show password prompt
    try {
      console.log("Auto-unlock failed, prompting for manual authentication");
      
      // Create a new promise that will be resolved when the user submits the password
      return new Promise<boolean>((resolve) => {
        // Store the resolve function in state so we can call it later
        setUnlockResolve(() => resolve);
        
        // Reset the password input and error
        setPasswordInputValue("");
        setPasswordModalError("");
        
        // Show the password modal
        setPasswordModalOpen(true);
      });
    } catch (error) {
      console.error("Error setting up password prompt:", error);
      toast({
        title: "Authentication error",
        description: "Could not unlock your secure vault. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  }
  
  // Function to handle password submission
  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!passwordInputValue) {
      setPasswordModalError("Password is required");
      return;
    }
    
    setIsUnlocking(true);
    
    try {
      console.log("Unlocking vault with provided password...");
      const unlocked = await vaultService.unlockVault(passwordInputValue);
      
      if (!unlocked) {
        setPasswordModalError("Incorrect password. Please try again.");
        setIsUnlocking(false);
        return;
      }
      
      console.log("Session is authenticated - proceeding with access");
      
      // Store the password in localStorage for future auto-unlocks across sessions
      // SECURITY NOTE: This is a trade-off between usability and security
      // We store the password to allow cross-session persistence for better user experience
      localStorage.setItem('last_auth_password', passwordInputValue);
      localStorage.setItem('auth_timestamp', Date.now().toString());
      
      // Store a simple hash of the password to detect changes
      const simpleHash = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(passwordInputValue)
      );
      const hashArray = Array.from(new Uint8Array(simpleHash));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      localStorage.setItem('password_hash_check', hashHex.substring(0, 16)); // Store just a part of hash
      
      console.log("Stored authentication data for future auto-unlock");
      
      // Create the payment vault if it doesn't exist yet
      try {
        await createPaymentVaultIfNeeded();
      } catch (error) {
        console.error("Error ensuring payment vault exists:", error);
        // Non-fatal, continue anyway
      }
      
      toast({
        title: "Authentication successful",
        description: "Your payment information is now accessible",
      });
      
      setPasswordModalOpen(false);
      setIsUnlocking(false);
      
      // Resolve the promise with true
      if (unlockResolve) {
        unlockResolve(true);
        setUnlockResolve(null);
      }
    } catch (error) {
      console.error("Error unlocking vault:", error);
      setPasswordModalError("An error occurred while unlocking the vault. Please try again.");
      setIsUnlocking(false);
      
      // Resolve the promise with false
      if (unlockResolve) {
        unlockResolve(false);
        setUnlockResolve(null);
      }
    }
  }
  
  // Function to handle password modal cancellation
  function handlePasswordCancel() {
    setPasswordModalOpen(false);
    
    // Resolve the promise with false
    if (unlockResolve) {
      unlockResolve(false);
      setUnlockResolve(null);
    }
    
    toast({
      title: "Authentication cancelled",
      description: "Vault access was cancelled.",
      variant: "destructive",
    });
  }
  
  // Load saved cards from the vault
  async function loadSavedCards() {
    setIsLoading(true);
    try {
      // Make sure the vault service is initialized first
      if (!await vaultService.isVaultInitialized()) {
        console.log("Vault system not initialized yet, initializing...");
        // Check if we have user keys first
        const keys = await getUserKeys();
        if (!keys || !isValidUserKeys(keys)) {
          console.error("No valid user keys found - cannot initialize vault");
          throw new Error("Authentication issue - please log in again");
        }
        
        // Initialize the vault system
        await vaultService.initialize();
        console.log("Vault system initialized successfully");
      }
      
      // Get the user's email from localStorage for cross-session persistence
      const sessionEmail = localStorage.getItem('session_email') || 
                          localStorage.getItem('current_user_email') ||
                          localStorage.getItem('last_session_email');
      
      if (!sessionEmail) {
        console.error("No user email found in storage - cannot load payment cards");
        throw new Error("User session is invalid");
      }
      
      // Set user-specific context to ensure correct decryption methods are used
      console.log(`Setting payment vault context for user: ${sessionEmail}`);
      localStorage.setItem('current_vault_context', sessionEmail);
      
      // Get user-specific encryption preference
      const userEncryptionPref = localStorage.getItem(`encryption_pref_${sessionEmail.replace(/[@.]/g, '_')}`);
      if (userEncryptionPref) {
        console.log(`User ${sessionEmail} has preferred encryption method: ${userEncryptionPref}`);
        localStorage.setItem('user_encryption_method', userEncryptionPref);
      }
      
      // Try to unlock the vault if needed
      if (!vaultService.isUnlocked()) {
        console.log("Attempting to auto-unlock vault for payment access...");
        const unlocked = await tryUnlockVault();
        
        if (!unlocked) {
          console.log("Could not unlock vault - aborting payment data access");
          setPaymentCards([]);
          setIsLoading(false);
          return;
        }
        
        console.log("Auto-authenticated for payment access");
      }

      // Get user-specific 'payments' vault or create it if doesn't exist
      const vaults = await vaultService.getVaults();
      console.log("Available vaults:", vaults.map(v => ({ id: v.id, type: v.type })));
      
      // Get vault namespace from localStorage for cross-session persistence                   
      let userVaultNamespace = localStorage.getItem('user_vault_namespace');
      
      // If not found, try to get from legacy localStorage key
      if (!userVaultNamespace) {
        userVaultNamespace = localStorage.getItem('last_vault_namespace');
        
        // If found in legacy location, update to new standardized location
        if (userVaultNamespace) {
          localStorage.setItem('user_vault_namespace', userVaultNamespace);
          console.log("Restored payment vault namespace from legacy location:", userVaultNamespace);
        }
      }
      
      console.log("Looking for payment vault with namespace:", userVaultNamespace);
      console.log("Session email:", sessionEmail);
      
      // Normalize email and create consistent payment vault ID format using standardized naming
      const normalizedEmail = sessionEmail.toLowerCase();
      const sanitizedEmail = normalizedEmail.replace(/[@.]/g, '_');
      const customVaultId = `user_${sanitizedEmail}_payments`;
      
      // Find the user-specific vault with consistent naming pattern (check both new and legacy formats)
      let paymentVault = vaults.find(vault => 
        vault.id === customVaultId || 
        vault.id === `payments-${normalizedEmail}` || 
        (vault.type === 'payments' && vault.id.includes(normalizedEmail))
      );
      
      if (!paymentVault) {
        console.log("Payment vault not found, creating new one");
        toast({
          title: "Creating payment vault",
          description: "Setting up encrypted storage for your payment information",
        });
        
        // Using consistent vault ID format
        console.log("Creating new payment vault with ID:", customVaultId);
        
        try {
          // Create the user-specific payments vault
          paymentVault = await vaultService.createNewVault(
            "Payment Information", 
            "payments" as any,
            customVaultId
          );
          
          // Store the namespace for future reference
          localStorage.setItem('user_vault_namespace', customVaultId);
          console.log("Created user-specific payment vault:", customVaultId);
        } catch (error) {
          console.error("Error creating payment vault:", error);
          throw new Error("Could not create secure payment storage");
        }
      }

      // Get all items from the payments vault
      const items = await vaultService.getItems(paymentVault.id);
      
      // Convert items to payment card info
      const cards = items
        .filter(item => item.metadata.type === "payment_card")
        .map(item => item.data as PaymentCardInfo);
      
      setPaymentCards(cards);
    } catch (error) {
      console.error("Error loading payment cards:", error);
      toast({
        title: "Error loading cards",
        description: "Could not load your saved payment methods",
        variant: "destructive",
      });
      setPaymentCards([]);
    } finally {
      setIsLoading(false);
    }
  }

  // Handle form submission
  async function onSubmit(data: PaymentCardFormData) {
    setIsProcessing(true);
    
    try {
      // Check if vault system is initialized
      if (!await vaultService.isVaultInitialized()) {
        console.log("Vault system not initialized yet, initializing...");
        // Check if we have user keys first
        const keys = await getUserKeys();
        if (!keys || !isValidUserKeys(keys)) {
          console.error("No valid user keys found - cannot initialize vault");
          throw new Error("Authentication issue - please log in again");
        }
        
        // Initialize the vault system
        await vaultService.initialize();
        console.log("Vault system initialized successfully for payment submission");
      }
      
      // Get the session email
      const sessionEmail = localStorage.getItem('session_email') || localStorage.getItem('current_user_email');
      
      if (!sessionEmail) {
        console.error("No user email found in session - cannot access payment vault");
        throw new Error("User session is invalid");
      }
      
      // Set user-specific context to ensure correct encryption methods are used
      console.log(`Setting payment vault context for user: ${sessionEmail}`);
      localStorage.setItem('current_vault_context', sessionEmail);
      
      // Remember the current encryption method for this user
      const currentEncryptionMethod = localStorage.getItem('user_encryption_method') || 
                                      localStorage.getItem('default_encryption_method') || 
                                      'webcrypto';
      
      // Store user's encryption preference for future sessions
      const userKey = `encryption_pref_${sessionEmail.replace(/[@.]/g, '_')}`;
      localStorage.setItem(userKey, currentEncryptionMethod);
      console.log(`Saved encryption preference for ${sessionEmail}: ${currentEncryptionMethod}`);
      
      // Check if vault is unlocked and try to unlock it if needed
      if (!vaultService.isUnlocked()) {
        console.log("Vault is locked - attempting to unlock for payment submission");
        const unlocked = await tryUnlockVault();
        
        if (!unlocked) {
          console.log("Could not unlock vault - aborting payment submission");
          setIsProcessing(false);
          return;
        }
        
        console.log("Vault unlocked successfully for payment submission");
      }

      // Get the user-specific payment vault
      const vaults = await vaultService.getVaults();
      console.log("Available vaults for payment submission:", vaults.map(v => ({ id: v.id, type: v.type })));
      
      // Normalize email and create consistent payment vault ID format using standardized naming
      const normalizedEmail = sessionEmail.toLowerCase();
      const sanitizedEmail = normalizedEmail.replace(/[@.]/g, '_');
      const customVaultId = `user_${sanitizedEmail}_payments`;
      
      console.log("Looking for payment vault with consistent ID:", customVaultId);
      
      // Find the user-specific payment vault with consistent naming (check both new and legacy formats)
      let paymentVault = vaults.find(vault => 
        vault.id === customVaultId || 
        vault.id === `payments-${normalizedEmail}` || 
        (vault.type === 'payments' && vault.id.includes(normalizedEmail))
      );
      
      if (!paymentVault) {
        console.log("Payment vault not found, creating new one for submission");
        
        // Using consistent vault ID format
        console.log("Creating new payment vault with ID:", customVaultId);
        
        try {
          // Create the user-specific payments vault
          paymentVault = await vaultService.createNewVault(
            "Payment Information", 
            "payments" as any,
            customVaultId
          );
          
          // Store the namespace for future reference
          localStorage.setItem('user_vault_namespace', customVaultId);
          console.log("Created user-specific payment vault:", customVaultId);
        } catch (error) {
          console.error("Error creating payment vault:", error);
          throw new Error("Could not create secure payment storage");
        }
      }

      // Extract last 4 digits of card number for display purposes
      const lastFourDigits = data.cardNumber.slice(-4);
      
      // Create payment card info object
      const paymentInfo: PaymentCardInfo = {
        id: editingCardId || `card_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        cardholderName: data.cardholderName,
        cardNumber: data.cardNumber,
        cardType: data.cardType,
        expiryMonth: data.expiryMonth,
        expiryYear: data.expiryYear,
        securityCode: data.securityCode,
        lastFourDigits,
        isDefault: paymentCards.length === 0, // First card is default
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      // Add billing address if provided
      if (data.saveAddress) {
        paymentInfo.billingAddress = {
          street: data.street || "",
          city: data.city || "",
          state: data.state || "",
          zipCode: data.zipCode || "",
          country: data.country || "",
        };
      }

      // If editing, find the item first to delete it
      if (editingCardId) {
        const items = await vaultService.getItems(paymentVault.id);
        const existingItem = items.find(item => 
          item.data && (item.data as PaymentCardInfo).id === editingCardId
        );
        
        if (existingItem) {
          // Delete the existing item first
          await vaultService.deleteItem(paymentVault.id, existingItem.id);
        }
      }
      
      // Apply the correct encryption method for this operation
      const encryptionMethod = localStorage.getItem('user_encryption_method') || 
                             localStorage.getItem(`encryption_pref_${sessionEmail.replace(/[@.]/g, '_')}`) || 
                             'webcrypto';
                             
      // Store this encryption method with the vault for future use
      const vaultEncryptMethodKey = `vault_${paymentVault.id}_encryption_method`;
      localStorage.setItem(vaultEncryptMethodKey, encryptionMethod);
      
      console.log(`Using ${encryptionMethod} for payment card encryption`);
      
      // Configure crypto modules for this operation
      await import('@/lib/crypto').then(crypto => {
        if (encryptionMethod === 'webcrypto') {
          // Force WebCrypto for this operation
          crypto.resetFallbackState();
          crypto.markUsingFallback('encrypt');
        } else {
          // Use WASM native encryption
          crypto.resetFallbackState();
        }
      });
      
      // Now add the card to vault with the configured encryption method
      await vaultService.addItem(
        paymentVault.id,
        `${data.cardType.toUpperCase()} ****${lastFourDigits}`,
        "payment_card",
        paymentInfo,
        {
          description: `${data.cardholderName}'s ${data.cardType} card`,
          tags: ["payment", "credit-card", data.cardType],
          searchTerms: [
            data.cardholderName.toLowerCase(),
            data.cardType.toLowerCase(),
            `card-${lastFourDigits}`
          ]
        }
      );

      // Reload cards
      await loadSavedCards();
      
      // Show success message
      toast({
        title: editingCardId ? "Card updated" : "Card added",
        description: `Your payment card has been securely ${editingCardId ? "updated" : "saved"}`,
      });
      
      // Reset form and UI state
      form.reset();
      setShowAddCardForm(false);
      setEditingCardId(null);
    } catch (error) {
      console.error("Error saving payment card:", error);
      toast({
        title: "Error saving card",
        description: "Could not save your payment information",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }

  // Function to edit a card
  function handleEditCard(card: PaymentCardInfo) {
    // Set form values from card
    form.reset({
      cardholderName: card.cardholderName,
      cardNumber: card.cardNumber,
      cardType: card.cardType,
      expiryMonth: card.expiryMonth,
      expiryYear: card.expiryYear,
      securityCode: card.securityCode,
      saveAddress: !!card.billingAddress,
      street: card.billingAddress?.street,
      city: card.billingAddress?.city,
      state: card.billingAddress?.state,
      zipCode: card.billingAddress?.zipCode,
      country: card.billingAddress?.country,
    });
    
    // Set editing state
    setEditingCardId(card.id);
    setShowAddCardForm(true);
  }

  // States for deletion dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);
  
  // Function to open the delete confirmation dialog
  function handleDeleteCardRequest(cardId: string) {
    setDeletingCardId(cardId);
    setDeleteDialogOpen(true);
  }
  
  // Function to delete a card after confirmation
  async function handleDeleteCard() {
    // Check if we have a card ID to delete
    if (!deletingCardId) {
      console.error("No card ID to delete");
      return;
    }
    
    setIsLoading(true);
    setDeleteDialogOpen(false);
    
    try {
      // Make sure the vault system is initialized first
      if (!await vaultService.isVaultInitialized()) {
        console.log("Vault system not initialized yet, initializing for deletion...");
        // Check if we have user keys first
        const keys = await getUserKeys();
        if (!keys || !isValidUserKeys(keys)) {
          console.error("No valid user keys found - cannot initialize vault");
          throw new Error("Authentication issue - please log in again");
        }
        
        // Initialize the vault system
        await vaultService.initialize();
        console.log("Vault system initialized successfully for deletion");
      }
      
      // Get the user's email from storage
      const sessionEmail = localStorage.getItem('session_email') || 
                          localStorage.getItem('current_user_email') ||
                          localStorage.getItem('last_session_email');
      
      if (!sessionEmail) {
        console.error("No user email found in session - cannot delete payment card");
        throw new Error("User session is invalid");
      }
      
      // Set user-specific context to ensure correct decryption methods are used
      console.log(`Setting payment vault context for user: ${sessionEmail}`);
      localStorage.setItem('current_vault_context', sessionEmail);
      
      // Get user-specific encryption preference
      const userEncryptionPref = localStorage.getItem(`encryption_pref_${sessionEmail.replace(/[@.]/g, '_')}`);
      if (userEncryptionPref) {
        console.log(`User ${sessionEmail} has preferred encryption method: ${userEncryptionPref}`);
        localStorage.setItem('user_encryption_method', userEncryptionPref);
      }
      
      // Check if vault is unlocked and try to unlock it if needed
      if (!vaultService.isUnlocked()) {
        console.log("Vault is locked - attempting to unlock for card deletion");
        const unlocked = await tryUnlockVault();
        
        if (!unlocked) {
          console.log("Could not unlock vault - aborting card deletion");
          setIsLoading(false);
          return;
        }
        
        console.log("Vault unlocked successfully for card deletion");
      }
      
      // Find the user-specific vault
      const vaults = await vaultService.getVaults();
      
      // Get the user's vault namespace
      const userVaultNamespace = localStorage.getItem('user_vault_namespace');
      
      // Find user-specific vault, fall back to type-based lookup for backward compatibility
      let paymentVault = userVaultNamespace 
        ? vaults.find(vault => vault.id === userVaultNamespace)
        : vaults.find(vault => vault.type === 'payments');
      
      if (!paymentVault) {
        throw new Error("Payment vault not found - please reload the page");
      }

      // Find all items in the vault
      const items = await vaultService.getItems(paymentVault.id);
      
      // Find the item with the matching card ID
      const item = items.find(item => 
        item.data && (item.data as PaymentCardInfo).id === deletingCardId
      );
      
      if (item) {
        // Delete the item using the vaultService
        await vaultService.deleteItem(paymentVault.id, item.id);
        
        // Refresh the list
        toast({
          title: "Card deleted",
          description: "Your payment method has been removed",
        });
        
        // Reload cards
        await loadSavedCards();
      }
    } catch (error) {
      console.error("Error deleting card:", error);
      toast({
        title: "Error deleting card",
        description: "Could not delete your payment method",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setDeletingCardId(null);
    }
  }

  // Function to set a card as default
  async function handleSetDefaultCard(cardId: string) {
    setIsLoading(true);
    
    try {
      // Make sure the vault system is initialized first
      if (!await vaultService.isVaultInitialized()) {
        console.log("Vault system not initialized yet, initializing for set default card...");
        // Check if we have user keys first
        const keys = await getUserKeys();
        if (!keys || !isValidUserKeys(keys)) {
          console.error("No valid user keys found - cannot initialize vault");
          throw new Error("Authentication issue - please log in again");
        }
        
        // Initialize the vault system
        await vaultService.initialize();
        console.log("Vault system initialized successfully for set default card");
      }
      
      // Get the user's email from storage
      const sessionEmail = localStorage.getItem('session_email') || 
                          localStorage.getItem('current_user_email') ||
                          localStorage.getItem('last_session_email');
      
      if (!sessionEmail) {
        console.error("No user email found in session - cannot update default payment card");
        throw new Error("User session is invalid");
      }
      
      // Set user-specific context to ensure correct decryption methods are used
      console.log(`Setting payment vault context for user: ${sessionEmail}`);
      localStorage.setItem('current_vault_context', sessionEmail);
      
      // Get user-specific encryption preference
      const userEncryptionPref = localStorage.getItem(`encryption_pref_${sessionEmail.replace(/[@.]/g, '_')}`);
      if (userEncryptionPref) {
        console.log(`User ${sessionEmail} has preferred encryption method: ${userEncryptionPref}`);
        localStorage.setItem('user_encryption_method', userEncryptionPref);
      }
      
      // Check if vault is unlocked and try to unlock it if needed
      if (!vaultService.isUnlocked()) {
        console.log("Vault is locked - attempting to unlock for setting default card");
        const unlocked = await tryUnlockVault();
        
        if (!unlocked) {
          console.log("Could not unlock vault - aborting setting default card");
          setIsLoading(false);
          return;
        }
        
        console.log("Vault unlocked successfully for setting default card");
      }
      
      // Get the user-specific payment vault
      const vaults = await vaultService.getVaults();
      
      // Get the user's vault namespace
      const userVaultNamespace = localStorage.getItem('user_vault_namespace');
      
      // Find user-specific vault, fall back to type-based lookup for backward compatibility
      let paymentVault = userVaultNamespace 
        ? vaults.find(vault => vault.id === userVaultNamespace)
        : vaults.find(vault => vault.type === 'payments');
      
      if (!paymentVault) {
        throw new Error("Payment vault not found - please reload the page");
      }

      // Get all items in the vault
      const items = await vaultService.getItems(paymentVault.id);
      
      // Update each card's default status
      for (const item of items) {
        if (item.metadata.type === "payment_card") {
          const card = item.data as PaymentCardInfo;
          const shouldBeDefault = card.id === cardId;
          
          // Only update if the default status changed
          if (card.isDefault !== shouldBeDefault) {
            // Create updated card with new default status
            const updatedCard: PaymentCardInfo = {
              ...card,
              isDefault: shouldBeDefault,
              updatedAt: Date.now()
            };
            
            // Update the card in the vault
            // First delete the old item
            await vaultService.deleteItem(paymentVault.id, item.id);
            
            // Apply the correct encryption method for this operation
            const encryptionMethod = localStorage.getItem('user_encryption_method') || 
                                   localStorage.getItem(`encryption_pref_${sessionEmail.replace(/[@.]/g, '_')}`) || 
                                   'webcrypto';
                                   
            // Store this encryption method with the vault for future use
            const vaultEncryptMethodKey = `vault_${paymentVault.id}_encryption_method`;
            localStorage.setItem(vaultEncryptMethodKey, encryptionMethod);
            
            console.log(`Using ${encryptionMethod} for default card update encryption`);
            
            // Configure crypto modules for this operation
            await import('@/lib/crypto').then(crypto => {
              if (encryptionMethod === 'webcrypto') {
                // Force WebCrypto for this operation
                crypto.resetFallbackState();
                crypto.markUsingFallback('encrypt');
              } else {
                // Use WASM native encryption
                crypto.resetFallbackState();
              }
            });
            
            // Then create a new item with the updated data and the configured encryption method
            await vaultService.addItem(
              paymentVault.id,
              `${updatedCard.cardType.toUpperCase()} ****${updatedCard.lastFourDigits}`,
              "payment_card",
              updatedCard,
              {
                description: `${updatedCard.cardholderName}'s ${updatedCard.cardType} card`,
                tags: ["payment", "credit-card", updatedCard.cardType],
                searchTerms: [
                  updatedCard.cardholderName.toLowerCase(),
                  updatedCard.cardType.toLowerCase(),
                  `card-${updatedCard.lastFourDigits}`
                ]
              }
            );
          }
        }
      }
      
      // Reload cards to reflect changes
      await loadSavedCards();
      
      toast({
        title: "Default card updated",
        description: "Your default payment method has been updated",
      });
    } catch (error) {
      console.error("Error setting default card:", error);
      toast({
        title: "Error updating default",
        description: "Could not update your default payment method",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {/* Password Dialog */}
      <Dialog open={passwordModalOpen} onOpenChange={(open) => {
        if (!open) handlePasswordCancel();
        setPasswordModalOpen(open);
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Vault Authentication</DialogTitle>
            <DialogDescription>
              Your payment information is encrypted. Please enter your password to unlock your secure vault.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={passwordInputValue}
                    onChange={(e) => setPasswordInputValue(e.target.value)}
                    autoFocus
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {passwordModalError && (
                  <p className="text-sm text-destructive">{passwordModalError}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={handlePasswordCancel}>
                Cancel
              </Button>
              <Button type="submit" disabled={isUnlocking}>
                {isUnlocking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Unlock
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment Method</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment method? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCard} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    
      {/* Main Payment Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment Methods</DialogTitle>
            <DialogDescription>
              {showAddCardForm 
                ? "Add your payment card details. All information is encrypted and stored locally." 
                : "Manage your saved payment methods. Your card data is encrypted and never sent to servers."}
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : showAddCardForm ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="cardholderName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cardholder Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="cardNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Card Number</FormLabel>
                        <FormControl>
                          <Input placeholder="1234 5678 9012 3456" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cardType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Card Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select card type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {cardTypes.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="expiryMonth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Month</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="MM" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {months.map(month => (
                              <SelectItem key={month} value={month}>
                                {month}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="expiryYear"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Year</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="YYYY" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {years.map(year => (
                              <SelectItem key={year} value={year}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="securityCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Security Code</FormLabel>
                        <FormControl>
                          <Input 
                            type="text" 
                            placeholder="CVC" 
                            maxLength={4} 
                            inputMode="numeric"
                            pattern="[0-9]*"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="saveAddress"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Save billing address</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                {form.watch("saveAddress") && (
                  <div id="billing-address-section" className="space-y-4 p-4 border rounded-md">
                    <FormField
                      control={form.control}
                      name="street"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Street Address</FormLabel>
                          <FormControl>
                            <Input placeholder="123 Main St" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input placeholder="New York" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State/Province</FormLabel>
                            <FormControl>
                              <Input placeholder="NY" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="zipCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ZIP/Postal Code</FormLabel>
                            <FormControl>
                              <Input placeholder="10001" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="country"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Country</FormLabel>
                            <FormControl>
                              <Input placeholder="USA" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowAddCardForm(false);
                      setEditingCardId(null);
                      form.reset();
                    }}
                    type="button"
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isProcessing}>
                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {editingCardId ? "Update" : "Save"} Payment Method
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          ) : (
            <>
              <div className="space-y-4">
                {paymentCards.length === 0 ? (
                  <div className="text-center py-6">
                    <CreditCard className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No payment methods saved yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paymentCards.map(card => (
                      <div key={card.id} className="border rounded-md p-4 flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">
                              {card.cardType.toUpperCase()} •••• {card.lastFourDigits}
                            </h4>
                            {card.isDefault && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {card.cardholderName} • Expires {card.expiryMonth}/{card.expiryYear.slice(-2)}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          {!card.isDefault && (
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleSetDefaultCard(card.id)}
                            >
                              Set as default
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditCard(card)}
                          >
                            Edit
                          </Button>
                          <Button 
                            variant="destructive" 
                            size="sm"
                            onClick={() => handleDeleteCardRequest(card.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <DialogFooter className="mt-6">
                <Button onClick={() => setShowAddCardForm(true)}>
                  Add Payment Method
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}