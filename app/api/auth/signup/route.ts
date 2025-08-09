//api/auth/signup
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(req: NextRequest) {
  try {
    const { name, email, password } = await req.json();

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (existingUser) {
      console.log('[SIGNUP] User already exists:', {
        email: existingUser.email,
        hasPassword: !!existingUser.password,
        hasGoogleId: !!existingUser.googleId,
        createdAt: existingUser.createdAt,
        name: existingUser.name
      });
      
      // If user exists but only has Google OAuth (no password), allow adding password
      if (existingUser.googleId && !existingUser.password) {
        console.log('[SIGNUP] Existing Google user adding password');
        existingUser.password = password; // This will trigger the pre-save hook to hash it
        existingUser.name = name; // Update name if provided
        await existingUser.save();
        
        const userResponse = {
          id: existingUser._id.toString(),
          name: existingUser.name,
          email: existingUser.email,
          role: existingUser.role || 'user',
          plan: existingUser.plan || 'free'
        };
        
        return NextResponse.json(
          { 
            message: "Password added to existing Google account", 
            user: userResponse 
          },
          { status: 200 }
        );
      }
      
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 }
      );
    }

    // Create user - the password will be hashed by the pre-save hook in your User model
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: password, // Don't hash here - let the model handle it
      emailVerified: null,
      lastLoginAt: new Date()
    });

    // Remove password from response
    const userResponse = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role || 'user',
      plan: user.plan || 'free'
    };

    return NextResponse.json(
      { 
        message: "User created successfully", 
        user: userResponse 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}