'use client'
import Image from "next/image";
import { useState, useEffect } from "react";
import { firestore, storage } from "@/firebase";
import { Box, Modal, Typography, Stack, TextField, Button, MenuItem, Select, InputLabel, FormControl, createTheme, ThemeProvider, CssBaseline, useMediaQuery } from "@mui/material";
import { collection, deleteDoc, doc, getDocs, query, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export default function Home() {
  const [inventory, setInventory] = useState([]);
  const [owners, setOwners] = useState([]);
  const [open, setOpen] = useState(false);
  const [ownerModalOpen, setOwnerModalOpen] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false); // State for image modal
  const [itemName, setItemName] = useState('');
  const [ownerNames, setOwnerNames] = useState([]);
  const [price, setPrice] = useState('');
  const [image, setImage] = useState(null);
  const [editItem, setEditItem] = useState(null);
  const [newOwner, setNewOwner] = useState('');
  const [selectedOwner, setSelectedOwner] = useState(''); // State for the selected owner
  const [filteredInventory, setFilteredInventory] = useState([]); // State for the filtered inventory
  const [selectedImage, setSelectedImage] = useState(''); // State for the selected image URL

  const capitalizeFirstLetter = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  const updateInventory = async () => {
    const snapshot = query(collection(firestore, "inventory"));
    const docs = await getDocs(snapshot);
    const inventoryList = [];
    docs.forEach((doc) => {
      inventoryList.push({
        name: doc.id,
        displayName: capitalizeFirstLetter(doc.id),
        owners: doc.data().owners || [], // Ensure owners is always an array
        ...doc.data(),
      });
    });
    setInventory(inventoryList.sort((a, b) => b.name.localeCompare(a.name))); // Sort by name in reverse order to ensure the newest is on top
    setFilteredInventory(inventoryList); // Initialize the filtered inventory
  };

  const updateOwners = async () => {
    const snapshot = query(collection(firestore, "owners"));
    const docs = await getDocs(snapshot);
    const ownersList = [];
    docs.forEach((doc) => {
      ownersList.push(doc.id);
    });
    setOwners(ownersList);
  };

  const handleImageUpload = async (file) => {
    const storageRef = ref(storage, `images/${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const addItem = async (item, ownerNames, price, image) => {
    const lowerCaseItem = item.toLowerCase();
    const docRef = doc(collection(firestore, "inventory"), lowerCaseItem);
    const docSnap = await getDoc(docRef);

    let imageUrl = '';
    if (image) {
      imageUrl = await handleImageUpload(image);
    }

    let newItem = {
      name: lowerCaseItem,
      displayName: capitalizeFirstLetter(item),
      owners: ownerNames,
      price,
      imageUrl,
      quantity: 1
    };

    if (docSnap.exists()) {
      const { quantity } = docSnap.data();
      await setDoc(docRef, { ...newItem, quantity: quantity + 1 }, { merge: true });
      newItem.quantity = quantity + 1;
    } else {
      await setDoc(docRef, newItem);
    }

    setInventory(prevInventory => {
      const updatedInventory = prevInventory.filter(i => i.name !== lowerCaseItem);
      return [newItem, ...updatedInventory];
    });
    setFilteredInventory(prevInventory => {
      const updatedInventory = prevInventory.filter(i => i.name !== lowerCaseItem);
      return [newItem, ...updatedInventory];
    });
  };

  const addOwner = async (owner) => {
    const ownerRef = doc(collection(firestore, "owners"), owner);
    await setDoc(ownerRef, {});
    setOwners([...owners, owner]);
  };

  const removeOwner = async (owner) => {
    const ownerRef = doc(collection(firestore, "owners"), owner);
    await deleteDoc(ownerRef);
    setOwners(prevOwners => prevOwners.filter(o => o !== owner));
    setInventory(prevInventory => prevInventory.map(item => ({
      ...item,
      owners: item.owners.filter(o => o !== owner)
    })));
    setFilteredInventory(prevInventory => prevInventory.map(item => ({
      ...item,
      owners: item.owners.filter(o => o !== owner)
    })));
  };

  const editItemDetails = async (item) => {
    setEditItem(item);
    setItemName(item.displayName);
    setOwnerNames(item.owners);
    setPrice(item.price);
    setImage(null);
    setOpen(true);
  };

  const saveItemDetails = async () => {
    try {
      const lowerCaseItem = itemName.toLowerCase();
      const oldItemName = editItem.name;
      const oldDocRef = doc(collection(firestore, "inventory"), oldItemName);
      const newDocRef = doc(collection(firestore, "inventory"), lowerCaseItem);

      let imageUrl = editItem.imageUrl; // Keep the existing imageUrl by default
      if (image) {
        console.log('Uploading image...');
        imageUrl = await handleImageUpload(image);
        console.log('Image uploaded, URL:', imageUrl);
      } else {
        console.log('No new image selected, using existing URL:', imageUrl);
      }

      const updatedItem = {
        name: lowerCaseItem,
        displayName: capitalizeFirstLetter(itemName),
        owners: ownerNames,
        price,
        imageUrl // Use the new or existing imageUrl
      };

      if (oldItemName !== lowerCaseItem) {
        await setDoc(newDocRef, updatedItem, { merge: true });
        await deleteDoc(oldDocRef);
        setInventory(prevInventory => {
          const updatedInventory = prevInventory.filter(i => i.name !== oldItemName);
          return [updatedItem, ...updatedInventory];
        });
        setFilteredInventory(prevInventory => {
          const updatedInventory = prevInventory.filter(i => i.name !== oldItemName);
          return [updatedItem, ...updatedInventory];
        });
      } else {
        await setDoc(newDocRef, updatedItem, { merge: true });
        setInventory(prevInventory => {
          const updatedInventory = prevInventory.map(i => i.name === lowerCaseItem ? { ...i, ...updatedItem } : i);
          return updatedInventory;
        });
        setFilteredInventory(prevInventory => {
          const updatedInventory = prevInventory.map(i => i.name === lowerCaseItem ? { ...i, ...updatedItem } : i);
          return updatedInventory;
        });
      }

      setEditItem(null);
      setOpen(false);
      setItemName('');
      setOwnerNames([]);
      setPrice('');
      setImage(null);
    } catch (error) {
      console.error('Error saving item details:', error);
    }
  };

  const removeItem = async (itemName) => {
    try {
      const docRef = doc(collection(firestore, "inventory"), itemName);
      await deleteDoc(docRef);
      setInventory(prevInventory => prevInventory.filter(i => i.name !== itemName));
      setFilteredInventory(prevInventory => prevInventory.filter(i => i.name !== itemName));
      setEditItem(null);
      setOpen(false);
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  useEffect(() => {
    updateInventory();
    updateOwners();
  }, []);

  useEffect(() => {
    if (selectedOwner) {
      setFilteredInventory(inventory.filter(item => item.owners.includes(selectedOwner)));
    } else {
      setFilteredInventory(inventory);
    }
  }, [selectedOwner, inventory]);

  const handleOpen = () => {
    setEditItem(null);
    setItemName('');
    setOwnerNames([]);
    setPrice('');
    setImage(null);
    setOpen(true);
  };
  const handleClose = () => setOpen(false);
  const handleOwnerModalOpen = () => setOwnerModalOpen(true);
  const handleOwnerModalClose = () => setOwnerModalOpen(false);
  const handleImageModalClose = () => setImageModalOpen(false); // Handle image modal close

  const theme = createTheme({
    palette: {
      mode: 'dark',
      background: {
        default: '#121212',
        paper: '#1e1e1e',
      },
      text: {
        primary: '#ffffff',
      },
    },
    typography: {
      fontFamily: 'Helvetica Neue, Arial, sans-serif',
    },
  });

  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box width="100vw" height="100vh" display="flex" flexDirection="column" alignItems="center" justifyContent="start" gap={2} paddingTop={isMobile ? 1 : 2}>
        <Box
          width={isMobile ? "100%" : "800px"}
          position="fixed"
          top={0}
          bgcolor="background.default"
          zIndex={1}
          display="flex"
          flexDirection="column"
          alignItems="center"
          paddingTop={isMobile ? 1 : 2}
          paddingBottom={isMobile ? 1 : 2}
          borderBottom="1px solid #333"
        >
          <Box width="100%" display="flex" alignItems="center" justifyContent="center" padding={2}>
            <Typography variant="h2" color="#fff" sx={{ fontWeight: 'bold', letterSpacing: 2 }}>
              DormMate
            </Typography>
          </Box>
          <Box display="flex" justifyContent="space-between" width="100%" paddingX={2} marginTop={2}>
            <Button variant="contained" onClick={handleOpen} style={{ marginBottom: 16 }}>ADD NEW ITEM</Button>
            <Button variant="contained" onClick={handleOwnerModalOpen} style={{ marginBottom: 16 }}>EDIT OWNERS</Button>
          </Box>
          <Box width="100%" paddingX={2} paddingTop={2}>
            <FormControl fullWidth>
              <InputLabel>Filter by Owner</InputLabel>
              <Select
                value={selectedOwner}
                onChange={(e) => setSelectedOwner(e.target.value)}
                label="Filter by Owner"
              >
                <MenuItem value="">All Owners</MenuItem>
                {owners.map((owner) => (
                  <MenuItem key={owner} value={owner}>
                    {owner}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>
        <Box
          width={isMobile ? "100%" : "800px"}
          marginTop={isMobile ? "275px" : "250px"}  // Adjust this margin to ensure the content is not hidden
          overflow="auto"
          height={isMobile ? "calc(100vh - 200px)" : "calc(100vh - 250px)"}
        >
          <Stack spacing={2}>
            {filteredInventory.map(({ name, quantity, displayName, owners = [], price, imageUrl }) => (
              <Box key={name} display="flex" flexDirection={isMobile ? "row" : "row"} alignItems="center" justifyContent="space-between" padding={2} borderBottom="1px solid #333">
                <Box display="flex" flexDirection="column" flex="2">
                  <Typography variant="h5">
                    <span style={{ fontWeight: 'bold' }}>{displayName}</span>
                  </Typography>
                  <Typography variant="subtitle1">
                    <span style={{ fontWeight: 'bold' }}>Owners:</span> {owners.join(', ')}
                  </Typography>
                  <Typography variant="subtitle1">
                    <span style={{ fontWeight: 'bold' }}>Price:</span> ${price}
                  </Typography>
                </Box>
                <Box display="flex" alignItems="center" justifyContent="flex-end" flex="1" marginLeft={isMobile ? 2 : 0}>
                  {imageUrl && <img src={imageUrl} alt={name} style={{ width: isMobile ? '150px' : '350px', height: isMobile ? '100px' : '250px', objectFit: 'cover', marginRight: '15px', cursor: 'pointer' }} onClick={() => { setSelectedImage(imageUrl); setImageModalOpen(true); }} />} {/* Added onClick */}
                </Box>
                <Box display="flex" gap={1} flex="1" justifyContent="flex-end">
                  <Button variant="outlined" onClick={() => editItemDetails({ name, displayName, owners, price, imageUrl })}>Edit</Button>
                </Box>
              </Box>
            ))}
          </Stack>
        </Box>
        <Modal open={imageModalOpen} onClose={handleImageModalClose}>
          <Box position="absolute" top="50%" left="50%" width={isMobile ? "90%" : "auto"} bgcolor="background.paper" border="2px solid #000" boxShadow={24} sx={{ transform: "translate(-50%,-50%)" }}>
            <img src={selectedImage} alt="Selected" style={{ width: "100%", height: "auto" }} />
          </Box>
        </Modal>
        <Modal open={open} onClose={handleClose}>
          <Box position="absolute" top="50%" left="50%" width={isMobile ? "90%" : 400} bgcolor="background.paper" border="2px solid #000" boxShadow={24} p={4} display="flex" flexDirection="column" gap={3} sx={{ transform: "translate(-50%,-50%)" }}>
            <Typography variant="h6">{editItem ? 'Edit Item' : 'Add Item'}</Typography>
            <Stack width="100%" direction="row" spacing={2}>
              <TextField variant="outlined" fullWidth label="Item Name" value={itemName} onChange={(e) => setItemName(e.target.value)} />
            </Stack>
            <Stack width="100%" direction="row" spacing={2}>
              <FormControl fullWidth>
                <InputLabel>Owners</InputLabel>
                <Select
                  multiple
                  value={ownerNames}
                  onChange={(e) => setOwnerNames(e.target.value)}
                  label="Owners"
                >
                  {owners.map((owner) => (
                    <MenuItem key={owner} value={owner}>
                      {owner}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
            <Stack width="100%" direction="row" spacing={2}>
              <TextField variant="outlined" fullWidth label="Price" value={price} onChange={(e) => setPrice(e.target.value)} />
            </Stack>
            <Stack width="100%" direction="row" spacing={2}>
              <input type="file" onChange={(e) => setImage(e.target.files[0])} />
            </Stack>
            <Stack width="100%" direction="row" spacing={2}>
              <Button variant="outlined" onClick={editItem ? saveItemDetails : async () => {
                await addItem(itemName, ownerNames, price, image);
                setItemName('');
                setOwnerNames([]);
                setPrice('');
                setImage(null);
                handleClose();
              }}>{editItem ? 'Save' : 'Add'}</Button>
              {editItem && <Button variant="outlined" color="error" onClick={() => removeItem(editItem.name)}>Remove</Button>}
            </Stack>
          </Box>
        </Modal>
        <Modal open={ownerModalOpen} onClose={handleOwnerModalClose}>
          <Box position="absolute" top="50%" left="50%" width={isMobile ? "90%" : 400} bgcolor="background.paper" border="2px solid #000" boxShadow={24} p={4} display="flex" flexDirection="column" gap={3} sx={{ transform: "translate(-50%,-50%)" }}>
            <Typography variant="h6">Edit Owners</Typography>
            <Stack width="100%" direction="column" spacing={2}>
              {owners.map((owner) => (
                <Box key={owner} display="flex" justifyContent="space-between" alignItems="center">
                  <Typography>{owner}</Typography>
                  <Button variant="outlined" color="error" onClick={() => removeOwner(owner)}>Remove</Button>
                </Box>
              ))}
              <TextField
                variant="outlined"
                fullWidth
                label="New Owner"
                value={newOwner}
                onChange={(e) => setNewOwner(e.target.value)}
              />
              <Button variant="outlined" onClick={async () => {
                await addOwner(newOwner);
                setNewOwner('');
              }}>Add Owner</Button>
            </Stack>
          </Box>
        </Modal>
      </Box>
    </ThemeProvider>
  );
}
