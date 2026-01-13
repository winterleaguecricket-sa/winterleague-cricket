// API endpoint for products CRUD operations
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'data', 'products.json');

// Default products
const defaultProducts = [
  {
    id: 1,
    name: "Elite Pro Cricket Bat",
    category: "premium",
    price: 299.99,
    description: "Professional grade English willow cricket bat",
    image: "/images/bat-pro.jpg",
    stock: 15,
    featured: true,
    sizes: ["Short Handle", "Long Handle", "Harrow", "Full Size"]
  },
  {
    id: 2,
    name: "Premium Leather Cricket Ball (Set of 6)",
    category: "premium",
    price: 89.99,
    description: "Tournament quality leather cricket balls",
    image: "/images/ball-premium.jpg",
    stock: 30,
    featured: false
  },
  {
    id: 3,
    name: "Professional Batting Gloves",
    category: "premium",
    price: 79.99,
    description: "High-quality leather gloves with superior protection",
    image: "/images/gloves-pro.jpg",
    stock: 25,
    featured: true,
    sizes: ["Youth", "Small", "Medium", "Large", "XL"]
  },
  {
    id: 4,
    name: "Elite Wicket Keeping Set",
    category: "premium",
    price: 249.99,
    description: "Complete wicket keeper gloves and leg guards",
    image: "/images/keeper-elite.jpg",
    stock: 10,
    featured: false,
    sizes: ["Youth", "Small", "Medium", "Large"]
  },
  {
    id: 5,
    name: "Training Cricket Bat - Kashmir Willow",
    category: "training",
    price: 79.99,
    description: "Durable bat perfect for practice sessions",
    image: "/images/bat-training.jpg",
    stock: 40,
    featured: true,
    sizes: ["Short Handle", "Long Handle", "Full Size"]
  },
  {
    id: 6,
    name: "Practice Tennis Balls (Set of 12)",
    category: "training",
    price: 24.99,
    description: "Soft tennis balls ideal for training",
    image: "/images/ball-training.jpg",
    stock: 100,
    featured: false
  },
  {
    id: 7,
    name: "Bowling Machine Portable",
    category: "training",
    price: 499.99,
    description: "Adjustable speed bowling machine for practice",
    image: "/images/bowling-machine.jpg",
    stock: 5,
    featured: true
  },
  {
    id: 8,
    name: "Training Stumps Set",
    category: "training",
    price: 49.99,
    description: "Lightweight portable stumps for training",
    image: "/images/stumps-training.jpg",
    stock: 35,
    featured: false
  },
  {
    id: 9,
    name: "Batting Practice Net",
    category: "training",
    price: 149.99,
    description: "Professional grade practice net system",
    image: "/images/practice-net.jpg",
    stock: 12,
    featured: false
  },
  {
    id: 10,
    name: "Coaching Kit Bundle",
    category: "training",
    price: 199.99,
    description: "Complete coaching essentials kit",
    image: "/images/coaching-kit.jpg",
    stock: 20,
    featured: true
  }
];

// Load data from file
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const fileData = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(fileData);
    }
  } catch (error) {
    console.error('Error loading products data:', error);
  }
  return { products: defaultProducts, idCounter: 11 };
}

// Save data to file
function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    console.log('Saved products:', data.products.length, 'products');
    return true;
  } catch (error) {
    console.error('Error saving products data:', error);
    return false;
  }
}

export default function handler(req, res) {
  const { method } = req;

  switch (method) {
    case 'GET': {
      // Get all products
      const data = loadData();
      const { category, featured } = req.query;
      let products = data.products;
      
      if (category) {
        products = products.filter(p => p.category === category);
      }
      if (featured === 'true') {
        products = products.filter(p => p.featured);
      }
      
      return res.status(200).json({ success: true, products });
    }

    case 'POST': {
      // Add new product
      const data = loadData();
      const { name, category, price, description, stock, featured, sizes, image } = req.body;
      
      if (!name || !category || price === undefined) {
        return res.status(400).json({ success: false, error: 'Name, category, and price are required' });
      }

      const newProduct = {
        id: data.idCounter++,
        name,
        category,
        price: parseFloat(price),
        description: description || '',
        stock: parseInt(stock) || 0,
        featured: featured || false,
        sizes: sizes || [],
        image: image || '/images/placeholder.jpg'
      };

      data.products.push(newProduct);
      
      if (saveData(data)) {
        return res.status(201).json({ success: true, product: newProduct, products: data.products });
      } else {
        return res.status(500).json({ success: false, error: 'Failed to save product' });
      }
    }

    case 'PUT': {
      // Update existing product
      const data = loadData();
      const { id, ...updates } = req.body;
      
      if (!id) {
        return res.status(400).json({ success: false, error: 'Product ID is required' });
      }

      const index = data.products.findIndex(p => p.id === parseInt(id));
      
      if (index === -1) {
        return res.status(404).json({ success: false, error: 'Product not found' });
      }

      // Update the product
      data.products[index] = {
        ...data.products[index],
        ...updates,
        id: parseInt(id), // Ensure ID stays the same
        price: updates.price !== undefined ? parseFloat(updates.price) : data.products[index].price,
        stock: updates.stock !== undefined ? parseInt(updates.stock) : data.products[index].stock
      };
      
      if (saveData(data)) {
        return res.status(200).json({ success: true, product: data.products[index], products: data.products });
      } else {
        return res.status(500).json({ success: false, error: 'Failed to update product' });
      }
    }

    case 'DELETE': {
      // Delete product
      const data = loadData();
      const { id } = req.query;
      
      if (!id) {
        return res.status(400).json({ success: false, error: 'Product ID is required' });
      }

      const index = data.products.findIndex(p => p.id === parseInt(id));
      
      if (index === -1) {
        return res.status(404).json({ success: false, error: 'Product not found' });
      }

      data.products.splice(index, 1);
      
      if (saveData(data)) {
        return res.status(200).json({ success: true, products: data.products });
      } else {
        return res.status(500).json({ success: false, error: 'Failed to delete product' });
      }
    }

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      return res.status(405).json({ success: false, error: `Method ${method} Not Allowed` });
  }
}
