
import { supabase } from "../lib/supabase";

// GET ALL BUILDINGS

export async function getBuildings() {
  const { data, error } = await supabase
    .from("buildings")
    .select("*")
    .order("name");

  if (error) throw error;

  return data;
}

// SEARCH BUILDINGS

export async function searchBuildings(query) {
  const { data, error } = await supabase
    .from("buildings")
    .select("*")
    .ilike("name", `%${query}%`);

  if (error) throw error;

  return data;
}

// GET ALL AMENITIES

export async function getAmenities() {
  const { data, error } = await supabase
    .from("amenities")
    .select("*")
    .order("name");

  if (error) throw error;

  return data;
}

// GET ALL FOOD OUTLETS

export async function getFoodOutlets() {
  const { data, error } = await supabase
    .from("food_outlets")
    .select("*")
    .order("name");

  if (error) throw error;

  return data;
}

// GET FOOD MENU

export async function getFoodItems(outletId) {
  const { data, error } = await supabase
    .from("food_items")
    .select("*")
    .eq("outlet_id", outletId)
    .order("name");

  if (error) throw error;

  return data;
}

// GET AMENITIES INSIDE A BUILDING

export async function getBuildingAmenities(buildingId) {
  const { data, error } = await supabase
    .from("amenities")
    .select("*")
    .eq("building_id", buildingId);

  if (error) throw error;

  return data;
}

// GET NAVIGATION PATHS

export async function getNavigationPaths() {
  const { data, error } = await supabase
    .from("navigation_paths")
    .select("*");

  if (error) throw error;

  return data;
}
